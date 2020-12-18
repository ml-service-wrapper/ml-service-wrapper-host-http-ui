import { Component } from '@angular/core';
import { FileSystemDirectoryEntry, FileSystemFileEntry, NgxFileDropEntry } from "ngx-file-drop";
import { first } from "rxjs/operators";
import { FileParserService } from "src/app/Utilities/file-parser.service";
import { IBatchDataset, IBatchProcessRequest, IDatasetSchema, WrapperApiClientService } from "src/app/Utilities/wrapper-api-client.service";


interface IColumnMapping {
    schema: IDatasetSchema;
    fileDataset: IBatchDatasetWithFields | null;
    mappings: Record<string, string>;
}

interface IBatchDatasetColumn {
    name: string;
}

interface IBatchDatasetWithFields extends IBatchDataset {
    columns: IBatchDatasetColumn[];
}

@Component({
    selector: 'app-process-page',
    templateUrl: './process-page.component.html',
    styleUrls: ['./process-page.component.scss']
})
export class ProcessPageComponent {

    public fileDatasets: IBatchDatasetWithFields[] = [];

    public inputs?: IColumnMapping[];

    public selectedMapping?: string;

    constructor(
        private readonly fileParserService: FileParserService,
        private readonly wrapperApiService: WrapperApiClientService
    ) {
        wrapperApiService.getSchemas().subscribe(c => {
            this.inputs = c.inputs.map(d => ({
                schema: d,
                fileDataset: null,
                mappings: {}
            }));

            this.selectedMapping = this.inputs[0].schema.name;
        });
    }

    public onFilesDropped(files: NgxFileDropEntry[]) {
        for (const droppedFile of files) {

            // Is it a file?
            if (droppedFile.fileEntry.isFile) {
                const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
                fileEntry.file(async (file: File) => {
                    const datasets = await this.fileParserService.parseDatasetFile(file);

                    const datasetsWithColumns = datasets.map(dataset => Object.assign({
                        columns: this.findColumns(dataset)
                    }, dataset));

                    this.fileDatasets = [...this.fileDatasets, ...datasetsWithColumns];
                });
            } else {
                // It was a directory (empty directories are added, otherwise only files)
                const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
                console.log(droppedFile.relativePath, fileEntry);
            }
        }
    }

    public async performProcessing() {
        if (!this.inputs) {
            return;
        }

        const req: IBatchProcessRequest = {
            datasets: []
        };

        for (const d of this.inputs) {
            req.datasets.push({
                name: d.schema.name,
                rows: d.fileDataset.rows.map(row => {
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
    }

    private findColumns(dataset: IBatchDataset) {
        const columns: Record<string, IBatchDatasetColumn> = {};

        for (const row of dataset.rows) {
            for (const name in row) {
                if (!row.hasOwnProperty(name)) {
                    continue;
                }

                if (columns[name]) {
                    continue;
                }

                columns[name] = {
                    name
                };
            }
        }

        return Object.values(columns);
    }
}
