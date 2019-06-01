////////////////////////////////////////////////////////////////////////////////
//
//						Copyright 2019 xxxxxxx, xxxxxxx
//	File:	Config.js
//	Author:	Bala B. (bhat.balasubramanya@gmail.com)
//	Description: Configuration File
//
////////////////////////////////////////////////////////////////////////////////

module.exports.MavlinkPortNum         = 2;
module.exports.CameraGPSPortNum       = 1;
module.exports.PushButtonGPIONum      = 22;       // Connected to GPIO22
module.exports.reset_active           = false;

// module.exports.MavlinkPortNum     = 0;
// module.exports.CameraGPSPortNum   = 0;

module.exports.PressureAtSeaLevel = 101325;  // Mean value is 101325

// module.exports.OnvifServiceAddr  = 'http://10.0.0.99:80/onvif/device_service';
module.exports.OnvifServiceAddr  = 'http://192.168.0.101:80/onvif/device_service';
