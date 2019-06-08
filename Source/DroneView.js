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
const GPS           = require('gps');
const Config        = require('./Config');
const CameraBaro    = require('./CameraBMP180');
const Math          = require('math');
const Gpio          = require('onoff').Gpio;

// List of all serial ports
var allsports     = new Array();

var dronelink;
var gpslink;
var camera_compass;
var camera_control;
var camera_baro;
var last_drone_gps_update = null;
var last_drone_alt_update = null;
var last_cam_gps_update = null;

const button = new Gpio(Config.PushButtonGPIONum, 'in', 'both', {debounceTimeout: 10});

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
  var selection = Config.MavlinkPortNum;
  if(selection <= 0) {
    ReadLineSync.keyInSelect(allsports, 'Please select the mavlink serial interface: ');
  }
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
  var selection = Config.CameraGPSPortNum;
  if(selection <= 0) {
      selection = ReadLineSync.keyInSelect(allsports, 'Please select the GPS serial interface: ');
  }
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

  // Start Camera Baro
  camera_baro = new CameraBaro;

  // Start reading various data
  setInterval(refreshView, REFRESH_INTERVAL_MS);
}

function refreshView()
{
  var drone_gps = null;
  var drone_baro = null;
  var camera_gps = null;
  var camera_compass_status = null;
  var camera_baro_status = null;
  var missing_data = false;

  // As long as reset button is pressed, we should should ignore all onputs
  if(Config.reset_active) {
    return;
  }

  var now = new Date();

  if(dronelink != null) {

    if(last_drone_gps_update == null ||
        ((now - last_drone_gps_update) > NO_DATA_TIMEOUT_MS)) {
      console.log('******************** No DRONE GPS update since ' + (now - last_drone_gps_update) / 1000 + ' seconds');

      // Still, use the last known drone Position...
      drone_gps = dronelink.gps;
      missing_data = true;
    }
    else {
      drone_gps = dronelink.gps;
      console.log(drone_gps);
    }

    if(last_drone_alt_update == null ||
        ((now - last_drone_alt_update) > NO_DATA_TIMEOUT_MS)) {
      console.log('******************** No DRONE altitude update since ' + (now - last_drone_alt_update) / 1000 + ' seconds');

      // Still, use the last known drone Position...
      drone_baro = dronelink.baro;
      missing_data = true;
    }
    else {
      drone_baro = dronelink.baro;
      console.log(drone_baro);
      console.log('Drone Temperature: ' + dronelink.temperature + ' degrees');
    }
  }

  if(gpslink != null) {
    if(last_cam_gps_update == null ||
        ((now - last_cam_gps_update) > NO_DATA_TIMEOUT_MS)) {
      console.log('******************** No CAMERA GPS update since ' + (now - last_cam_gps_update) / 1000 + ' seconds');

      // Still, use the last known Position...
      camera_gps = gpslink.gps;
      missing_data = true;
    }
    else {
      camera_gps = gpslink.gps;
      console.log(camera_gps);
    }
  }

  if(camera_compass != null) {
    if(camera_compass.status.timestamp == null ||
        ((now - camera_compass.status.timestamp) > NO_DATA_TIMEOUT_MS)) {
      console.log('******************** No CAMERA Compass update since ' + (now - camera_compass.status.timestamp) / 1000 + ' seconds');

      // Still, use the last known Position...
      camera_compass_status = camera_compass.status;
      missing_data = true;
    }
    else {
      camera_compass_status = camera_compass.status;
      console.log(camera_compass_status);
    }
  }

  if(camera_baro != null) {
    if(camera_baro.status.timestamp == null ||
      ((now - camera_baro.status.timestamp) > NO_DATA_TIMEOUT_MS)) {
      console.log('******************** No CAMERA Baro update since ' + (now - camera_baro.status.timestamp) / 1000 + ' seconds');

      // Still, use the last known Position...
      camera_baro_status = camera_baro.status;
      missing_data = true;
    }
    else {
      camera_baro_status = camera_baro.status;
      console.log(camera_baro_status);
    }
  }

  redirectCamera(drone_gps,
                 drone_baro,
                 camera_gps,
                 camera_compass_status,
                 camera_baro_status,
                 missing_data);
}

function redirectCamera(drone_gps, drone_baro, camera_gps, camera_compass_status, camera_baro_status, missing_data)
{
  //console.log('redirectCamera...');

  if( missing_data == false &&
      drone_gps != null &&
      drone_baro != null &&
      camera_gps != null &&
      camera_compass_status != null &&
      camera_baro_status != null) {

    // 1. Calculate Drone's direction wrt Magnetic North
    var abs_heading = GPS.Heading(camera_gps.lat, camera_gps.lon, drone_gps.lat, drone_gps.lon);
    var drone_distance = GPS.Distance(camera_gps.lat, camera_gps.lon, drone_gps.lat, drone_gps.lon) * 1000.0; // In meters

    console.log('abs_heading = ' + abs_heading);

    // 2. Camera's direction wrt Magnetic North
    var cam_heading = camera_compass_status.hdg;

    console.log('cam_heading = ' + cam_heading);

    // 3. Calculate relative heading
    var rel_heading = (abs_heading + 360 - cam_heading) % 360;

    console.log('rel_heading = ' + rel_heading);

    // Direct the Camera. Convert heading to range b/w -180 to +180
    var xdeg = rel_heading;
    if(xdeg > 180) {
      xdeg = (xdeg - 360);
    }

    // Now the Y direction
    var ydeg = 0;

    if(drone_baro.alt >= camera_baro_status.altitude) {
      ydeg = Math.atan((drone_baro.alt - camera_baro_status.altitude) / drone_distance);
    }

    console.log('--------------------------------------------->>> set CAMERA Position: ' + xdeg + ' ' + ydeg + ' degrees');
    CameraControl.setPosition(xdeg, 0);
  }
  else {
    // Treat it like test MODE
    // Direct the Camera. Convert heading to range b/w -180 to +180
    if(camera_compass_status != null) {
      var xdeg = camera_compass_status.hdg;
      if(xdeg > 180) {
        xdeg = (xdeg - 360);
      }

      console.log('---------------------------------------------<<< Hold CAMERA Position: ' + xdeg + ' ' + 0 + ' degrees >>>');
      CameraControl.setPosition(xdeg, 0);
    }
  }
}

button.watch((err, value) => {
  if (err) {
    throw err;
  }

  console.log('Button: ' + value);

  if(Config.reset_active == false && value == true) {
    CameraControl.resetPosition();

    last_drone_gps_update = null;
    last_drone_alt_update = null;
    last_cam_gps_update = null;
  }

  Config.reset_active = value;
});

// process.on('SIGINT', () => {
// button.unexport();
// });
