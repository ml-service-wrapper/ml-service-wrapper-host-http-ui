import { TestBed } from '@angular/core/testing';
import { WrapperApiClientService } from './wrapper-api-client.service';


describe('WrapperApiClientService', () => {
  let service: WrapperApiClientService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WrapperApiClientService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
