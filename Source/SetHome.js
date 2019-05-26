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

  // var params = {
  //  'ProfileToken': profile['token'],
  //   'Position'    : {'x': 1, 'y': 1, 'z': 0.000},
  //   'Speed'       : {'x': 1, 'y': 1, 'z': 1}
  // };
  //
  // device.services.ptz.absoluteMove(params).then((result) => {

  // }).catch((error) => {
  //   console.error(error);
  // });

  var params = {
   'ProfileToken': profile['token'],
  };

  // Send the GotoHomePosition command using the gotoHomePosition() method
  device.services.ptz.setHomePosition(params);

  // Get the UDP stream URL
  let url = device.getUdpStreamUrl();
  console.log(url);

}).catch((error) => {
  console.error(error);
});
