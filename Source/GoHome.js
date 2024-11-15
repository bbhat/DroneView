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

var device;

// Create an OnvifDevice object
device = new onvif.OnvifDevice({
  xaddr: Config.OnvifServiceAddr,
  user : 'droneview',
  pass : 'QAV500V2'
});

// Initialize the OnvifDevice object
device.init().then(() => {

  var profile = device.getCurrentProfile();

  var params = {
   'ProfileToken': profile['token'],
    'Speed'       : 1.0
  };

  device.services.ptz.gotoHomePosition(params).then((result) => {
  }).catch((error) => {
    console.error(error);
  });

  // Get the UDP stream URL
  let url = device.getUdpStreamUrl();
  console.log(url);

}).catch((error) => {
  console.error(error);
});
