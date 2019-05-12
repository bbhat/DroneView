////////////////////////////////////////////////////////////////////////////////
//
//						Copyright 2019 xxxxxxx, xxxxxxx
//	File:	DroneView.js
//	Author:	Bala B. (bhat.balasubramanya@gmail.com)
//	Description: DroneView
//
////////////////////////////////////////////////////////////////////////////////

// Constants
const REFRESH_INTERVAL_MS = 300;
const NO_DATA_TIMEOUT_MS = 30000;

// Required modules
const SerialPort    = require('serialport');
const ReadLineSync  = require('readline-sync');
const DroneLink     = require('./DroneLink');
const GPSLink       = require('./GPSLink');
const CameraCompass = require('./CompassHMC5983');
const CameraControl = require('./CameraControl');

// List of all serial ports
var allsports     = new Array();

var dronelink;
var gpslink;
var camera_compass;
var camera_control;
var last_drone_gps_update = new Date();
var last_drone_alt_update = new Date();
var last_cam_gps_update = new Date();

//------------------------------------------------------------------------------
//        SerialPort
//------------------------------------------------------------------------------
SerialPort.list(function(err, ports) {

  if (err) {
    throw err;
  }

  // Read the serial port name to be used
  if (ports.length == 0) {
    console.log('No serial ports found');
    process.exit(0);
  }

  ports.forEach((port) => {
    allsports.push(port.comName);
  });

  // Read user input for Dronelink serial port
  var selection = ReadLineSync.keyInSelect(allsports, 'Please select the mavlink serial interface: ');
  if (selection > 0) {

    dronelink = new DroneLink(allsports[selection]);

    dronelink.on('global_position', () => {
      last_drone_gps_update = new Date();
    });

    dronelink.on('pressure_alt', () => {
      last_drone_alt_update = new Date();
    });
  }

  //------------------------------------------------------------------------------
  //        GPS Link
  //------------------------------------------------------------------------------

  // Read user input for GPSLink serial port
  var selection = ReadLineSync.keyInSelect(allsports, 'Please select the GPS serial interface: ');
  if (selection > 0) {

    gpslink = new GPSLink(allsports[selection]);

    gpslink.on('global_position', () => {
      last_cam_gps_update = new Date();
    });
  }

  setImmediate(startProcessing);
});

function startProcessing() {

  // if(gpslink == null || dronelink == null) {
  //   console.log('Don\'t have GPS or Drone Link. Exiting...');
  //   process.exit(0);
  // }

  console.log('Starting DroneView...');

  // Start the Camera Compass
  camera_compass = new CameraCompass;

  // Start CameraControl
  CameraControl.cameraInit();

  // Start reading various data
  setInterval(refreshView, REFRESH_INTERVAL_MS);
}

function refreshView()
{
  var drone_gps = null;
  var drone_baro = null;
  var camera_gps = null;
  var camera_compass_status = null;

  var now = new Date();

  if(dronelink != null) {

    if((now - last_drone_gps_update) > NO_DATA_TIMEOUT_MS) {
      console.log('No drone GPS update since ' + (now - last_drone_gps_update) / 1000 + ' seconds');
    }
    else {
      drone_gps = dronelink.gps;
      console.log(drone_gps);
    }

    if((now - last_drone_alt_update) > NO_DATA_TIMEOUT_MS) {
      console.log('No drone altitude update since ' + (now - last_drone_alt_update) / 1000 + ' seconds');
    }
    else {
      drone_baro = dronelink.baro;
      console.log(drone_baro);
      console.log(dronelink.temperature);
    }
  }

  if(gpslink != null) {
    if((now - last_cam_gps_update) > NO_DATA_TIMEOUT_MS) {
      console.log('No camera GPS update since ' + (now - last_cam_gps_update) / 1000 + ' seconds');
    }
    else {
      camera_gps = gpslink.gps;
      console.log(camera_gps);
    }
  }

  if(camera_compass != null) {
    if((now - camera_compass.status.timestamp) > NO_DATA_TIMEOUT_MS) {
      console.log('No camera Compass update since ' + (now - camera_compass.status.timestamp) / 1000 + ' seconds');
    }
    else {
      camera_compass_status = camera_compass.status;
      console.log(camera_compass_status);
    }
  }

  redirectCamera(drone_gps,
                 drone_baro,
                 camera_gps,
                 camera_compass_status);
}

function redirectCamera(drone_gps, drone_baro, camera_gps, camera_compass_status)
{
  //console.log('redirectCamera...');

  if(camera_compass_status != null) {
    var xdeg = (camera_compass_status.hdg - 180.0);
    CameraControl.setPosition(xdeg, 0);
  }
}
