'use strict';

describe('Service: webGL', function () {

  // load the service's module
  beforeEach(module('oculusViewApp'));

  // instantiate service
  var webGL;
  beforeEach(inject(function (_webGL_) {
    webGL = _webGL_;
  }));

  it('should do something', function () {
    expect(!!webGL).toBe(true);
  });

});
