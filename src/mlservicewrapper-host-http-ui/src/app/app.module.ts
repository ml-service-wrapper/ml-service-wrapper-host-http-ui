import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { BrowserModule } from '@angular/platform-browser';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxFileDropModule } from "ngx-file-drop";
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ProcessPageComponent } from './Pages/process-page/process-page.component';



@NgModule({
  declarations: [
    AppComponent,
    ProcessPageComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    NgxFileDropModule,
    NgbModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
