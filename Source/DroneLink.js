////////////////////////////////////////////////////////////////////////////////
//
//						Copyright 2019 xxxxxxx, xxxxxxx
//	File:	DroneConnect.js
//	Author:	Bala B. (bhat.balasubramanya@gmail.com)
//	Description: Program to connect to Drone over mavlink
//
////////////////////////////////////////////////////////////////////////////////

// Required modules
const MavLink       = require('mavlink');
const SerialPort    = require('serialport');
const EventEmitter  = require('events');

//------------------------------------------------------------------------------
//        GPS class
//------------------------------------------------------------------------------
class DroneGPSStatus {
    constructor() {
      this.timestamp = 0;

      this.lat = 0.0,
      this.lon = 0.0;

      // Left test coordinates (Veda Temple)
      // this.lat = 37.431193,
      // this.lon = -121.9015449;

      // Right test coordinates (Selwyn Park)
      // this.lat = 37.4334226,
      // this.lon = -121.8850117;

      // North test coordinates (Golf land)
      // this.lat = 37.4422842,
      // this.lon = -121.893151;


      // South test coordinates (Target)
      // this.lat = 37.4231542,
      // this.lon = -121.8894507;

      this.alt = 0.0;
      this.relative_alt = 0.0;
      this.hdg = 0.0;
    }
}

//------------------------------------------------------------------------------
//        Baro class
//------------------------------------------------------------------------------
class DroneBaroStatus {
  constructor() {
    this.timestamp = 0;
    this.alt = 0.0;
  }
}

//------------------------------------------------------------------------------
//        DroneLink class
//------------------------------------------------------------------------------
class DroneLink extends EventEmitter {
  constructor(portname) {

    super();

    this._mavportname = portname;
    this._mavport  = new SerialPort(this._mavportname, {
                          baudRate: 57600
                        });
    this.temperature = 0.0;
    this.gps = new DroneGPSStatus;
    this.baro = new DroneBaroStatus;

    // Create a new mavlink instance passing (sysid, compid, version, definitions)
    // Pass 0, 0 so that we can receive all incoming messages
    this._mavlink       = new MavLink(0, 0, 'v1.0', ['common', 'pixhawk']);

    this._mavport.on('open', () => {
      console.log('Serial port ' + this._mavportname + ' ' + 'opened successfully. Waiting for data...');
    });

    //------------------------------------------------------------------------------
    //        MavLink functions
    //------------------------------------------------------------------------------

    // Wait for 'ready' event on the mav
    this._mavlink.on('ready', () => {
      console.log('Mavlink ready. Waiting for drone connection...');

      this._mavport.on('data', (data) => {
        this._mavlink.parse(data);
      });
    });


    // _mavlink.on('message', (message) => {
    //   console.log(message.id);
    // });

    this._mavlink.on('GLOBAL_POSITION_INT', (message, fields) => {
      // console.log('GPS (lat: ' + fields.lat +
      //                 ' lon: ' + fields.lon +
      //                 ' alt: ' + fields.alt +
      //                 ' gnd alt: ' + fields.relative_alt +
      //                 ' hdg: ' + fields.hdg);

      this.gps.timestamp = fields.timestamp;
      this.gps.lat = fields.lat / 10000000.0; // Convert to float from degE7 format
      this.gps.lon = fields.lon / 10000000.0; // Convert to float from degE7 format
      this.gps.alt = fields.alt / 1000.0;     // Convert from mm to Meters
      this.gps.relative_alt = fields.relative_alt / 1000.0;      // Convert from mm to Meters
      this.gps.hdg = fields.hdg / 100.0;      // Convert from 100th of degrees to float degrees

      this.emit('global_position');
    });

    this._mavlink.on('HIGHRES_IMU', (message, fields) => {
      // console.log('HIGHRES_IMU (pressure_alt: ' + fields.pressure_alt +
      //                      ' temperature: ' + fields.temperature);
      this.baro.alt = fields.pressure_alt / 1000.0;   // Convert mm to Meters
      this.temperature = fields.temperature;
      this.emit('pressure_alt');
    });
  }
}

module.exports = DroneLink;
