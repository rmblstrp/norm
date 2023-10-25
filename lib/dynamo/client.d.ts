import * as DynamoDB from "aws-sdk/clients/dynamodb";
import { ClientOptions } from "../configuration";
export declare function factory(options?: ClientOptions): DynamoDB.DocumentClient;
