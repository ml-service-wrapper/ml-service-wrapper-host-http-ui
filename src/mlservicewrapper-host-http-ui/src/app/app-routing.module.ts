import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProcessPageComponent } from "./Pages/process-page/process-page.component";


const routes: Routes = [
  {
    path: "process",
    component: ProcessPageComponent
  },
  {
    pathMatch: "full",
    path: "",
    redirectTo: "/process"
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
