import { GraphQLInputObjectType, GraphQLObjectType, GraphQLType } from "graphql";
import { TypeGuards } from "../../guards/type-guards";
import { StringUtils } from "../string/string-utils";
import { BaseTransformer } from "./base";

export class ObjectTransformer extends BaseTransformer {
  public transform(objectType: GraphQLObjectType | GraphQLInputObjectType) {
    let output = "";

    if (
      (objectType.name === "Mutation" || objectType.name === "Query") &&
      TypeGuards.isObjectType(objectType)
    ) {
      const fields = objectType.getFields();

      for (const fieldKey in fields) {
        const field = fields[fieldKey];
        const args = field.args;

        output += `export type ${StringUtils.capitalize(field.name)}${objectType.name}Variables = {`;

        for (const arg of args) {
          const type = arg.type;
          const isNonNullable = TypeGuards.isNonNullable(type);
          const isInputObjectType = TypeGuards.isInputObjectType(type);

          const key = arg.name;
          const value = this.buildFromOutputType(type, { isNonNullable, isInputObjectType });

          output += `\n${StringUtils.indent(this.createKeyValuePair(key, value))};`;
        }

        output += "\n};\n\n";

        output += `export type ${StringUtils.capitalize(field.name)}${objectType.name} = {
          __typename?: "${objectType.name}",
          ${field.name}: ${this.buildFromOutputType(field.type, { isNonNullable: false, isInputObjectType: false })}
        };\n\n`;
      }

      return output;
    }

    output = `export type ${objectType.name} = {\n`;

    if (!TypeGuards.isInputObjectType(objectType)) {
      output += StringUtils.indent(`__typename?: "${objectType.name}";\n`);
    }

    const fields = objectType.getFields();

    for (const fieldKey in fields) {
      const field = fields[fieldKey];
      const type = field.type;

      const isNonNullable = TypeGuards.isNonNullable(type);
      const isInputObjectType = TypeGuards.isInputObjectType(type);

      const key = field.name;
      const value = this.buildFromOutputType(type, { isNonNullable, isInputObjectType });

      output += `${StringUtils.indent(this.createKeyValuePair(key, value))};\n`;
    }

    output += "};\n\n";

    return output;
  }

  private createKeyValuePair(key: string, value: string) {
    return `${key}: ${value}`;
  }

  private buildFromOutputType(
    type: GraphQLType,
    metaType: { isNonNullable: boolean; isInputObjectType: boolean },
  ): string {
    let value = "";

    if (TypeGuards.isNonNullable(type)) {
      return this.buildFromOutputType(type.ofType, { ...metaType, isNonNullable: true });
    } else {
      if (TypeGuards.isList(type)) {
        return `Array<${this.buildFromOutputType(type.ofType, metaType)}>`;
      } else if (TypeGuards.isScalar(type)) {
        value += this.scalar(type, metaType);
      } else if (TypeGuards.isUnion(type)) {
        value += this.union(type);
      } else if (TypeGuards.isEnum(type)) {
        value += this.enum(type);
      } else {
        value += this.object(type);
      }
    }

    if (metaType.isNonNullable) {
      return value;
    }

    return this.makeMaybe(value);
  }
}
