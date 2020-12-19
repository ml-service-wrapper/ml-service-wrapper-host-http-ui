import { Component } from '@angular/core';
import { FileSystemDirectoryEntry, FileSystemFileEntry, NgxFileDropEntry } from "ngx-file-drop";
import { first } from "rxjs/operators";
import { FileFormatterService } from "src/app/Utilities/file-formatter.service";
import { FileParserService } from "src/app/Utilities/file-parser.service";
import { IBatchDataTable, IBatchProcessRequest, IDataTableSchema, IDataTableSchemaColumn, WrapperApiClientService } from "src/app/Utilities/wrapper-api-client.service";


interface IColumnMapping {
    schema: IDataTableSchema;
    fileDataTable: IBatchDataTableWithFields | null;
    mappings: Record<string, string | null>;
}

interface IBatchDataTableColumn {
    name: string;
    schema?: IDataTableSchemaColumn;
}

interface IBatchDataTableWithFields<T = unknown> extends IBatchDataTable<T> {
    columns: IBatchDataTableColumn[];
}

interface IBatchDataTableWithFieldsAndSchema<T = unknown> extends IBatchDataTableWithFields<T> {
    schema?: IDataTableSchema;
}

@Component({
    selector: 'app-process-page',
    templateUrl: './process-page.component.html',
    styleUrls: ['./process-page.component.scss']
})
export class ProcessPageComponent {

    public fileDataTables: IBatchDataTableWithFields[] = [];

    public inputs?: IColumnMapping[];

    public selectedMapping?: string;

    public outputDataTables: IBatchDataTableWithFieldsAndSchema[];

    private outputSchemas: IDataTableSchema[];

    constructor(
        private readonly fileParserService: FileParserService,
        private readonly fileFormatterService: FileFormatterService,
        private readonly wrapperApiService: WrapperApiClientService
    ) {
        wrapperApiService.getSchemas().subscribe(c => {
            this.inputs = c.inputs.map(d => {

                const mappings = {};

                for (const c of d.columns) {
                    mappings[c.name] = null;
                }

                return {
                    schema: d,
                    fileDataTable: null,
                    mappings
                };
            });

            this.outputSchemas = c.outputs;

            this.selectedMapping = this.inputs[0].schema.name;
        });
    }

    public exportExcel() {
        this.fileFormatterService.saveExcel(this.outputDataTables);
    }

    public onFilesDropped(files: NgxFileDropEntry[]) {
        for (const droppedFile of files) {

            // Is it a file?
            if (droppedFile.fileEntry.isFile) {
                const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
                fileEntry.file(async (file: File) => {
                    const dataTables = await this.fileParserService.parseDataTableFile(file);

                    const dataTablesWithColumns = dataTables.map(dataTable => this.enrichDataTableSchema(dataTable));

                    this.fileDataTables = [...this.fileDataTables, ...dataTablesWithColumns];

                    if (this.inputs) {
                        for (const file of dataTablesWithColumns) {
                            const lowercaseFileName = file.name.toLocaleLowerCase();

                            for (const input of this.inputs) {
                                if (this.inputs.length > 1 && input.schema.name.toLocaleLowerCase() !== lowercaseFileName) {
                                    continue;
                                }

                                if (input.fileDataTable) {
                                    continue;
                                }

                                input.fileDataTable = file;

                                for (const fileColumn of file.columns) {
                                    const lowercaseFileColumName = fileColumn.name.toLocaleLowerCase();

                                    for (const inputColumn of input.schema.columns) {
                                        if (inputColumn.name.toLocaleLowerCase() === lowercaseFileColumName) {
                                            input.mappings[inputColumn.name] = fileColumn.name;
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
            } else {
                // It was a directory (empty directories are added, otherwise only files)
                const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
                console.log(droppedFile.relativePath, fileEntry);
            }
        }
    }

    private enrichDataTableSchema<T>(dataTable: IBatchDataTable<T>, schema?: IDataTableSchema): { columns: IBatchDataTableColumn[]; } & IBatchDataTable<T> {
        return Object.assign({
            columns: this.findColumns(dataTable, schema),
            schema
        }, dataTable);
    }

    public async performProcessing() {
        if (!this.inputs) {
            return;
        }

        const req: IBatchProcessRequest = {
            tables: []
        };

        for (const d of this.inputs) {
            req.tables.push({
                name: d.schema.name,
                rows: d.fileDataTable.rows.map(row => {
                    const ret = {};

                    for (const m in d.mappings) {
                        if (!d.mappings.hasOwnProperty(m)) {
                            continue;
                        }

                        ret[m] = row[d.mappings[m]];
                    }

                    return ret;
                })
            });
        }

        const resp = await this.wrapperApiService.performBatchProcessing(req).pipe(first()).toPromise();

        this.outputDataTables = resp.tables.map(c => {
            const schema = this.outputSchemas.find(x => x.name === c.name);

            return this.enrichDataTableSchema(c, schema);
        });
    }

    private findColumns(dataTable: IBatchDataTable, schema?: IDataTableSchema) {
        const columns: Record<string, IBatchDataTableColumn> = {};

        for (const row of dataTable.rows) {
            for (const name in row) {
                if (!row.hasOwnProperty(name)) {
                    continue;
                }

                if (columns[name]) {
                    continue;
                }

                columns[name] = {
                    name,
                    schema: schema?.columns.find(x => x.name === name)
                };
            }
        }

        return Object.values(columns);
    }
}
