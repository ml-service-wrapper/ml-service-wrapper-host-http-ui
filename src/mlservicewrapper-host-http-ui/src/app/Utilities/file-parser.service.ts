import { Injectable } from '@angular/core';
import { read, utils, WorkBook } from "xlsx";
import { IBatchDataTable } from "./wrapper-api-client.service";

@Injectable({
    providedIn: 'root'
})
export class FileParserService {

    constructor() { }

    async parseDataTableFile(file: File): Promise<IBatchDataTable<Record<string, any>>[]> {
        switch (file.type) {
            case "application/json": {
                const json = JSON.parse(await file.text());

                if (Array.isArray(json)) {
                    return [
                        {
                            name: file.name,
                            rows: json
                        }
                    ];
                }

                break;
            }
            case "application/vnd.ms-excel": {
                return await this.parseExcelDataTable(file);
            }
            default: {
                console.log(file.type);
                break;
            }
        }

        return [];
    }

    async parseExcelDataTable(file: File): Promise<IBatchDataTable[]> {
        const workbook = await this.readExcelWorkbook(file);

        return workbook.SheetNames.map((sheetName) => ({
            name: sheetName,
            rows: utils.sheet_to_json(workbook.Sheets[sheetName])
        }));
    }

    private readExcelWorkbook(file: File) {
        return new Promise<WorkBook>((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const data = e.target.result;
                const workbook = read(data, {
                    type: 'binary'
                });

                resolve(workbook);
            };

            reader.onerror = function (ex) {
                reject(ex);
            };

            reader.readAsBinaryString(file);
        });
    }
}
