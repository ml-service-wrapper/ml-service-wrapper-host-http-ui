import { HttpClient } from "@angular/common/http";
import { Injectable } from '@angular/core';
import { JSONSchema4 } from "json-schema";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface IBatchDataset<T extends Record<string, any> = Record<string, any>> {
    name: string;
    rows: T[];
}

export interface IBatchProcessRequest {
    datasets: IBatchDataset[];
}

export interface IBatchProcessResponse {
    datasets: IBatchDataset[];
}

interface IApiSwaggerDatasetCollection<T extends Record<string, JSONSchema4>> {
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
                                "inputs": IApiSwaggerDatasetCollection<TIn>
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "schema": {
                            "type": "object",
                            "properties": {
                                "outputs": IApiSwaggerDatasetCollection<TOut>
                            }
                        }
                    }
                }
            }
        }
    }
};

export interface IDatasetSchema {
    name: string;
    required: boolean;
    columns: {
        name: string;
        required: boolean;
        schema: JSONSchema4;
    }[];
}

export interface IApiStatus {
    ready: boolean;
    status: string;
}

@Injectable({
    providedIn: 'root'
})
export class WrapperApiClientService {

    public baseUrl: string = "http://127.0.0.1:8000";

    constructor(
        protected readonly http: HttpClient
    ) { }

    getStatus() {
        return this.get<IApiStatus>("/api/status");
    }

    performBatchProcessing(req: IBatchProcessRequest): Observable<IBatchProcessResponse> {
        const inputs: Record<string, any[]> = {};

        for (const dataset of req.datasets) {
            inputs[dataset.name] = dataset.rows;
        }

        const body = {
            inputs
        };

        return this.post<{ outputs: Record<string, any[]> }>("/api/process/batch", body).pipe(
            map(resp => {
                const datasets: IBatchDataset[] = [];

                for (const name in resp.outputs) {
                    if (!resp.outputs.hasOwnProperty(name)) {
                        continue;
                    }

                    datasets.push({
                        name,
                        rows: resp.outputs[name]
                    });
                }

                return {
                    datasets
                }
            })
        );
    }

    getSchemas(): Observable<{ inputs: IDatasetSchema[], outputs: IDatasetSchema[] }> {
        return this.get<IApiSwagger>("/swagger/v1/swagger.json").pipe(
            map(resp => {
                const requestSchema = resp.paths["/api/process/batch"].post;

                const inputSchema = requestSchema.parameters.filter(c => c.in === "body")[0]?.schema.properties.inputs;
                const inputs = Array.from(this.getDatasets(inputSchema));

                const outputSchema = requestSchema.responses[200].schema.properties.outputs;
                const outputs = Array.from(this.getDatasets(outputSchema));

                return {
                    inputs,
                    outputs
                };
            })
        );
    }

    protected get<T>(url: string) {
        return this.http.get<T>(this.getUrl(url));
    }
    protected post<T>(url: string, body: any) {
        return this.http.post<T>(this.getUrl(url), body);
    }

    private getUrl(relative: string) {
        let baseUrl = this.baseUrl;
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.slice(0, -1);
        }

        if (relative.startsWith("/")) {
            relative = relative.substr(1);
        }

        return baseUrl + "/" + relative;
    }

    private * getDatasets<T extends Record<string, JSONSchema4>>(spec: IApiSwaggerDatasetCollection<T>): Generator<IDatasetSchema, void, unknown> {

        for (const name in spec.properties) {
            if (!spec.properties.hasOwnProperty(name)) {
                continue;
            }

            const columns: IDatasetSchema["columns"] = [];

            let datasetSchemaArr = spec.properties[name].items;

            const datasetSchema = Array.isArray(datasetSchemaArr) ? datasetSchemaArr[0] : datasetSchemaArr;

            if (datasetSchema) {
                for (const columnName in datasetSchema.properties) {
                    const required = Array.isArray(datasetSchema.required) ? datasetSchema.required.indexOf(columnName) >= 0 : false;

                    columns.push({
                        name: columnName,
                        required,
                        schema: datasetSchema.properties[columnName]
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
