'use strict';

describe('Service: WebCamService', function () {

  // load the service's module
  beforeEach(module('oculusViewApp'));

  // instantiate service
  var webCamService;
  beforeEach(inject(function (_webCamService_) {
    webCamService = _webCamService_;
  }));

  it('should do something', function () {
    //expect(!!webCamService).toBe(true);
  });

});
