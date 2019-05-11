////////////////////////////////////////////////////////////////////////////////
//
//						Copyright 2019 xxxxxxx, xxxxxxx
//	File:	GPSConnect.js
//	Author:	Bala B. (bhat.balasubramanya@gmail.com)
//	Description: Program to connect to GPS Module over serial
//
////////////////////////////////////////////////////////////////////////////////

// Required modules
const SerialPort    = require('serialport');
const GPS           = require('gps')
const EventEmitter  = require('events');

//------------------------------------------------------------------------------
//        GPS class
//------------------------------------------------------------------------------
class GPSStatus {
    constructor() {
      this.timestamp = 0;
      this.lat = 0;
      this.lon = 0;
      this.alt = 0;
    }
}

//------------------------------------------------------------------------------
//        GPSLink class
//------------------------------------------------------------------------------
class GPSLink extends EventEmitter {
  constructor(portname) {

    super();

    this._gpsportname = portname;
    this._gpsport     = new SerialPort(this._gpsportname, {
                          baudRate: 9600
                        });
    this.gps          = new GPSStatus;

    this._gpsport.on('open', () => {
      console.log('Serial port ' + this._gpsportname + ' ' + 'opened successfully. Waiting for data...');
    });

    var position    = new GPS;

    this._gpsport.on('data', (data) => {
      position.updatePartial(data);
    });

    position.on('data', (data) => {
      this.gps.timestamp = position.state.time;
      this.gps.lat = position.state.lat;
      this.gps.lon = position.state.lon;
      this.gps.alt = position.state.alt;
      this.emit('global_position');
    });
  }
}

module.exports = GPSLink;
