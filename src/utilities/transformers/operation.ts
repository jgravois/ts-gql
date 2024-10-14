import { GraphQLArgument, GraphQLField, GraphQLObjectType, GraphQLType } from "graphql";
import { TypeGuards } from "../../guards/type-guards";
import { StringUtils } from "../string/string-utils";
import { BaseTransformer } from "./base";

export class OperationTransformer extends BaseTransformer {
  private _objectMap: Record<string, string> = {};

  public transform(operationType: GraphQLObjectType, specifier: string) {
    let output = "";

    const fields = operationType.getFields();

    for (const fieldKey in fields) {
      output += this.buildOperation(fields[fieldKey], specifier);
    }

    return output;
  }

  private buildOperation(field: GraphQLField<any, any>, specifier: string) {
    let output = "";

    let operation = `${specifier} ${StringUtils.capitalize(field.name)}`;
    let alias = field.name;

    operation += this.buildArgs(field.args, (arg) => `${arg.name}: ${arg.type}`);
    alias += this.buildArgs(field.args, (arg) => `${arg.name}: $${arg.name}`);

    output += `${operation} {\n`;
    output += `${StringUtils.indent(alias)}`;
    output += this.buildFields(field.type);
    output += `\n}\n\n`;

    return output;
  }

  private buildArgs(
    args: readonly GraphQLArgument[],
    keyValuePairCallback: (args: GraphQLArgument) => string,
  ) {
    if (args.length) {
      return `(${args.map(keyValuePairCallback).join(", ")})`;
    }

    return "";
  }

  private buildFields(type: GraphQLType, depth = 2) {
    let output = "";

    const baseType = this.findBaseType(type);

    if (TypeGuards.isObjectType(baseType)) {
      if (this._objectMap[baseType.name]) {
        output += this._objectMap[baseType.name];
      } else {
        const fields = baseType.getFields();

        output += " {\n";

        for (const fieldKey in fields) {
          const field = fields[fieldKey];

          const baseField = this.findBaseType(field);

          output += `${StringUtils.indent(field.name, depth)}`;

          if (TypeGuards.isObjectType(baseField)) {
            output += this.buildFields(baseField, depth + 1);
          } else if (TypeGuards.isUnion(baseField)) {
            const types = baseField.getTypes();

            for (const type of types) {
              output += `\n${StringUtils.indent(`... on ${type.name}`, depth)}${this.buildFields(type, depth + 1)}`;
            }
          }

          output += "\n";
        }

        output += StringUtils.indent(`}`, depth - 1);
      }

      this._objectMap[baseType.name] = output;
    }

    return output;
  }

  private findBaseType<T extends GraphQLType | GraphQLField<any, any>>(type: T): any {
    if ("ofType" in type) {
      return this.findBaseType(type.ofType);
    } else if ("type" in type) {
      return this.findBaseType(type.type);
    } else {
      return type;
    }
  }
}
