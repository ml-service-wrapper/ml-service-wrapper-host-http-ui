import { Injectable } from '@angular/core';
import { utils, writeFile } from "xlsx";
import { IBatchDataTable } from "./wrapper-api-client.service";

@Injectable({
    providedIn: 'root'
})
export class FileFormatterService {

    constructor() { }

    saveExcel(dataTable: IBatchDataTable<any>[]) {
        const workbook = utils.book_new();

        for (const table of dataTable) {
            const worksheet = utils.json_to_sheet(table.rows);

            utils.book_append_sheet(workbook, worksheet, table.name);
        }

        writeFile(workbook, "ouput.xlsx");
    }
}
