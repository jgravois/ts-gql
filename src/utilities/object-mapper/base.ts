import { GraphQLField, GraphQLType } from "graphql";
import { StringUtils } from "../string/string-utils";

export type MetaTypeData = {
  isNonNullable?: boolean;
  isList?: boolean;
  isScalar?: boolean;
  isUnion?: boolean;
};

export abstract class BaseType<T> {
  protected name: string;
  protected pairs: { key: string; value: string; metaTypeData?: MetaTypeData }[] = [];
  protected separator: string;
  protected eol: string;

  constructor(protected type: T) {}

  keyValuePair(key: string, value: string) {
    return `${key}${this.separator}${value}${this.eol}`;
  }

  protected buildPairs(depth: number = 0) {
    // let pairs = "";

    // for (const { key, value } of this.pairs) {
    //   pairs += this.keyValuePair(key, value);
    // }

    return this.pairs.reduce((acc, { key, value }) => {
      return `${acc}${StringUtils.indent(this.keyValuePair(key, value), depth)}`;
    }, "");
  }
}

export abstract class BaseObjectType<T> extends BaseType<T> {
  protected _scalarPrimitiveTypeMap: Record<string, { input: string; output: string }> = {
    ID: { input: "string", output: "string" },
    String: { input: "string", output: "string" },
    Int: { input: "number", output: "number" },
    Float: { input: "number", output: "number" },
    Boolean: { input: "boolean", output: "boolean" },
  };

  protected findBaseType<T extends GraphQLType | GraphQLField<any, any>>(type: T): GraphQLType {
    if ("ofType" in type) {
      return this.findBaseType(type.ofType);
    } else if ("type" in type) {
      return this.findBaseType(type.type);
    } else {
      return type;
    }
  }
}
