'use strict';

describe('Service: oculus', function () {

  // load the service's module
  beforeEach(module('oculusViewApp'));

  // instantiate service
  var oculus;
  beforeEach(inject(function (_oculus_) {
    oculus = _oculus_;
  }));

  it('should do something', function () {
    //expect(!!oculus).toBe(true);
  });

});
