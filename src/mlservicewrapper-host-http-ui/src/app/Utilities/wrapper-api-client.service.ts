import { HttpClient } from "@angular/common/http";
import { Inject, Injectable } from '@angular/core';
import { JSONSchema4 } from "json-schema";
import { Observable, of } from "rxjs";
import { map, switchMap } from "rxjs/operators";
import { API_BASE_URL } from "src/main";

export interface IBatchDataTable<T extends Record<string, any> = Record<string, any>> {
    name: string;
    rows: T[];
}

export interface IBatchProcessRequest {
    tables: IBatchDataTable[];
}

export interface IBatchProcessResponse {
    tables: IBatchDataTable[];
}

interface IApiSwaggerDataTableCollection<T extends Record<string, JSONSchema4>> {
    type: "object";
    properties: T;
    required: (keyof this["properties"])[];
}

interface IApiSwagger<TIn extends Record<string, JSONSchema4> = Record<string, JSONSchema4>, TOut extends Record<string, JSONSchema4> = Record<string, JSONSchema4>> {
    "swagger": "2.0",
    "info": {
        "title": string;
        "version": string;
    },
    "paths": {
        "/api/process/batch": {
            "post": {
                "parameters": [
                    {
                        "name": "request",
                        "in": "body",
                        "required": true,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "inputs": IApiSwaggerDataTableCollection<TIn>
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "schema": {
                            "type": "object",
                            "properties": {
                                "outputs": IApiSwaggerDataTableCollection<TOut>
                            }
                        }
                    }
                }
            }
        }
    }
};

export interface IDataTableSchemaColumn {
    name: string;
    required: boolean;
    schema: JSONSchema4;
}

export interface IDataTableSchema {
    name: string;
    description?: string;
    required: boolean;
    columns: IDataTableSchemaColumn[];
}

export interface IApiStatus {
    ready: boolean;
    status: string;
}

@Injectable({
    providedIn: 'root'
})
export class WrapperApiClientService {

    readonly baseUrl$: Observable<string>;

    constructor(
        protected readonly http: HttpClient,
        @Inject(API_BASE_URL) apiBaseUrl: string
    ) {
        this.baseUrl$ = of(apiBaseUrl);
    }

    getStatus() {
        return this.get<IApiStatus>("/api/status");
    }

    performBatchProcessing(req: IBatchProcessRequest): Observable<IBatchProcessResponse> {
        const inputs: Record<string, any[]> = {};

        for (const dataTable of req.tables) {
            inputs[dataTable.name] = dataTable.rows;
        }

        const body = {
            inputs
        };

        return this.post<{ outputs: Record<string, any[]> }>("/api/process/batch", body).pipe(
            map(resp => {
                const tables: IBatchDataTable[] = [];

                for (const name in resp.outputs) {
                    if (!resp.outputs.hasOwnProperty(name)) {
                        continue;
                    }

                    tables.push({
                        name,
                        rows: resp.outputs[name]
                    });
                }

                return {
                    tables: tables
                }
            })
        );
    }

    getSchemas(): Observable<{ inputs: IDataTableSchema[], outputs: IDataTableSchema[] }> {
        return this.get<IApiSwagger>("/swagger/v1/swagger.json").pipe(
            map(resp => {
                const requestSchema = resp.paths["/api/process/batch"].post;

                const inputSchema = requestSchema.parameters.filter(c => c.in === "body")[0]?.schema.properties.inputs;
                const inputs = Array.from(this.getDataTables(inputSchema));

                const outputSchema = requestSchema.responses[200].schema.properties.outputs;
                const outputs = Array.from(this.getDataTables(outputSchema));

                return {
                    inputs,
                    outputs
                };
            })
        );
    }

    protected get<T>(url: string) {
        return this.getUrl(url).pipe(
            switchMap(u => this.http.get<T>(u))
        );
    }
    protected post<T>(url: string, body: any) {
        return this.getUrl(url).pipe(
            switchMap(u => this.http.post<T>(u, body))
        );
    }

    private getUrl(relative: string) {

        if (relative.startsWith("/")) {
            relative = relative.substr(1);
        }

        return this.baseUrl$.pipe(
            map(c => c.endsWith("/") ? c.slice(0, -1) : c),
            map(c => c + "/" + relative)
        );
    }

    private * getDataTables<T extends Record<string, JSONSchema4>>(spec: IApiSwaggerDataTableCollection<T>): Generator<IDataTableSchema, void, unknown> {

        for (const name in spec.properties) {
            if (!spec.properties.hasOwnProperty(name)) {
                continue;
            }

            const columns: IDataTableSchema["columns"] = [];

            let dataTableSchemaArr = spec.properties[name].items;

            const dataTableSchema = Array.isArray(dataTableSchemaArr) ? dataTableSchemaArr[0] : dataTableSchemaArr;

            if (dataTableSchema) {
                for (const columnName in dataTableSchema.properties) {
                    const required = Array.isArray(dataTableSchema.required) ? dataTableSchema.required.indexOf(columnName) >= 0 : false;

                    columns.push({
                        name: columnName,
                        required,
                        schema: dataTableSchema.properties[columnName]
                    });
                }
            }

            yield {
                name,
                required: spec.required.indexOf(name) >= 0,
                columns
            };
        }
    }
}
