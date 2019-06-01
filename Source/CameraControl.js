////////////////////////////////////////////////////////////////////////////////
//
//						Copyright 2019 xxxxxxx, xxxxxxx
//	File:	onviftest.js
//	Author:	Bala B. (bhat.balasubramanya@gmail.com)
//	Description: Communicating with ONVIF cameras
//
////////////////////////////////////////////////////////////////////////////////

const onvif = require('node-onvif');
const Config = require('./Config');

const CAMERA_MOVE_INTERVAL_MS = 1000;

var device;
var positionX = 0;
var positiony = 0;

function cameraInit()
{
  // Create an OnvifDevice object
  device = new onvif.OnvifDevice({
    xaddr: Config.OnvifServiceAddr,
    user : 'droneview',
    pass : 'QAV500V2'
  });

  // Initialize the OnvifDevice object
  device.init().then(() => {

      // Start a timer for redireciting camera
      setInterval(redirectCamera, CAMERA_MOVE_INTERVAL_MS, device);

      // Get the UDP stream URL
      let url = device.getUdpStreamUrl();
      console.log(url);
  }).catch((error) => {
    console.error(error);
  });
}

function redirectCamera(device)
{
  if(Config.reset_active) {
    return;
  }

  var profile = device.getCurrentProfile();

  // First stop the current movement
  var params = {
   'ProfileToken': profile['token'],
   'PanTilt': true,
   'Zoom': true
   };

   device.services.ptz.stop(params).then((result) => {
      var params = {
       'ProfileToken': profile['token'],
        'Position'    : {'x': positionX, 'y': positionY, 'z': 1.0},
        'Speed'       : {'x': 1, 'y': 1, 'z': 1}
      };

      device.services.ptz.absoluteMove(params).then((result) => {
      }).catch((error) => {
        console.error(error);
      });

    }).catch((error) => {
      console.error(error);
    });
}

function setPosition(xdeg, ydeg)
{
  //<<<<<
  // The HikVision Camera being used behaves madly if the rotation is not in the range -90 to +90
  // if(xdeg < -180.0) xdeg = -180.0;
  // if(xdeg > 180.0) xdeg = 180.0;
  // if(ydeg < 0.0) ydeg = 0;
  // if(ydeg > 90.0) xdeg = 90.0;

  if(xdeg < -90.0) xdeg = -90.0;
  if(xdeg > 90.0) xdeg = 90.0;
  if(ydeg < 0.0) ydeg = 0.0;
  if(ydeg > 90.0) xdeg = 90.0;
  //>>>>>

  // console.log('move: ' + xdeg + ' ' + ydeg);

  // Normalize xdeg (-1 to + 1)
  positionX = xdeg / 180.0;

  // The camera's + direction is to west and - is to East
  // Reverse the polarity
  positionX = -positionX;

  // Normalize ydeg (-1 to +1). Zero is at 45 debgrees.
  positionY = (ydeg - 45.0) / 45.0;
}

function resetPosition()
{
  if(device == null) {
    return;
  }

  console.log('Reset Camera Position');

  // Reset the current position
  positionX = 0.0;
  positionY = 0.0;

  // And the Camera position
  var profile = device.getCurrentProfile();

  // First stop the current movement
  var params = {
   'ProfileToken': profile['token'],
   'PanTilt': true,
   'Zoom': true
   };

   device.services.ptz.stop(params).then((result) => {
    var params = {
     'ProfileToken': profile['token'],
      'Position'    : {'x': 0, 'y': 0, 'z': 0.0},
      'Speed'       : {'x': 1, 'y': 1, 'z': 1}
    };

    device.services.ptz.absoluteMove(params).then((result) => {
    }).catch((error) => {
      console.error(error);
    });

  }).catch((error) => {
    console.error(error);
  });
}

module.exports.cameraInit = cameraInit;
module.exports.setPosition = setPosition;
module.exports.resetPosition = resetPosition;
