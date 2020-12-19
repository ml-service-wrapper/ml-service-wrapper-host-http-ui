import { TestBed } from '@angular/core/testing';

import { FileFormatterService } from './file-formatter.service';

describe('FileFormatterService', () => {
  let service: FileFormatterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FileFormatterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
