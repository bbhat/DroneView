////////////////////////////////////////////////////////////////////////////////
//
//						Copyright 2019 xxxxxxx, xxxxxxx
//	File:	DroneConnect.js
//	Author:	Bala B. (bhat.balasubramanya@gmail.com)
//	Description: Program to read Heading value from HMC5983 Compass module
//
////////////////////////////////////////////////////////////////////////////////

const I2C     = require('i2c-bus');
const assert  = require('assert');
const math    = require('math');

const REFRESH_INTERVAL_MS = 500;
//
// From HMC5983 datasheet
// https://aerospace.honeywell.com/~/media/UWSAero/common/documents/myaerospacecatalog-documents/Defense_Brochures-documents/HMC5983_3_Axis_Compass_IC.pdf
//
const HMC5983_ADDR          = 0x1E;     // RW
const REG_CONFIG_A          = 0x00;     // RW
const REG_CONFIG_B          = 0x01;     // RW
const REG_MODE              = 0x02;     // RO
const REG_MSB_X             = 0x03;     // RO
const REG_LSB_X             = 0x04;     // RO
const REG_MSB_Z             = 0x05;     // RO
const REG_LSB_Z             = 0x06;     // RO
const REG_MSB_Y             = 0x07;     // RO
const REG_LSB_Y             = 0x08;     // RO
const REG_STATUS            = 0x09;     // RO
const REG_ID_A              = 0x0A;     // RO
const REG_ID_B              = 0x0B;     // RO
const REG_ID_C              = 0x0C;     // RO
const REG_MSB_TEMPERATURE   = 0x31;     // RO
const REG_LSB_TEMPERATURE   = 0x32;     // RO

const BUS_NUM               = 1;        // We are using I2C_1 bus on Raspberry Pi

//------------------------------------------------------------------------------
//        CompassStatus class
//------------------------------------------------------------------------------
class CompassStatus {
    constructor() {
      this.timestamp = 0;
      this.hdg = 0.0;
      this.temperature = 0.0;
    }
}

//------------------------------------------------------------------------------
//        CompassStatus class
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
//        DroneLink class
//------------------------------------------------------------------------------
class CompassHMC5983 {

  constructor() {

    this.status = new CompassStatus;

    // Initial configuration happens synchronously
    this.i2cbus = I2C.open(BUS_NUM, (err) => {

      if(err) throw err;

      // Write to Configuration Register A
      const CONFIG_A = (1 << 7)         // Enable Temperature sensor for automatic
                                      // compensation of Sensitivity over temperature.
                     | (3 << 5)       // Average 8 samples
                     | (1 << 2)       // Data rate (1.5 Hz)
                     | (0 << 0);      // Normal measurement configuration (Default)

      // Write to Configuration Register A
      const CONFIG_B = (1 << 5);        // Default gain

      // Set the Mode Register
      const MODE = (0 << 0);            // Continuous Measurement Mode

      // Write 3 bytes starting from REG_CONFIG_A
      const cmdSetConfig = Buffer.from([REG_CONFIG_A, CONFIG_A, CONFIG_B, MODE]);
      this.i2cbus.i2cWrite(HMC5983_ADDR,
                              cmdSetConfig.length,
                              cmdSetConfig,
                              () => {
        setInterval(getHeading, REFRESH_INTERVAL_MS, this);
      });
    });
  };
}

function getHeading(compass)
{
  // First read the STATUS register to make sure there is valid data
  const cmdSetRegPtr = Buffer.from([REG_STATUS]);
  compass.i2cbus.i2cWrite(HMC5983_ADDR, cmdSetRegPtr.length, cmdSetRegPtr, () => {
    var status = new Buffer(1);
    compass.i2cbus.i2cRead(HMC5983_ADDR, status.length, status, () => {
      if(status[0] & 0x01) {
        dataReady(compass);
      }
    });
  });
}


function dataReady(compass)
{
  // Set the register pointer
  const cmdSetRegPtr = Buffer.from([REG_MSB_X]);
  compass.i2cbus.i2cWrite(HMC5983_ADDR, cmdSetRegPtr.length, cmdSetRegPtr, () => {

    // Read X/Y/Z coordinates
    var coordinates = Buffer.from([0, 0, 0, 0, 0, 0]);
    compass.i2cbus.i2cRead(HMC5983_ADDR, coordinates.length, coordinates, () => {

      // Convert the register data into Heading in degrees
      toHeading(compass, coordinates);

      // Now read the temperature as well
      readTemperature(compass);

      console.log(compass.status);
    });
  });
}

function readTemperature(compass)
{
  // Set the register pointer
  const cmdSetRegPtr = Buffer.from([REG_MSB_TEMPERATURE]);
  compass.i2cbus.i2cWrite(HMC5983_ADDR, cmdSetRegPtr.length, cmdSetRegPtr, () => {

    // Read the temperature
    var buffer = Buffer.from([0, 0]);
    compass.i2cbus.i2cRead(HMC5983_ADDR, buffer.length, buffer, () => {
      compass.status.temperature = toCentigrade(buffer);
    });
  });
}

function toCentigrade(buffer)
{
  assert(buffer.length == 2);

  // From the datasheet Temperature = (MSB*2^8+LSB)/(2^4*8)+25in C
  return ((((buffer[0] << 8) | buffer[1]) / 256) + 25) ;
}

function toHeading(compass, buffer)
{
  assert(buffer.length == 6);

  // Calculate the heading values for all the three sensors
  // Range is 0xF800 to 0x07FF or -2048 to 2047
  var hx = (buffer[0] << 8) | buffer[1];
  var hz = (buffer[2] << 8) | buffer[3];
  var hy = (buffer[4] << 8) | buffer[5];

  // Convert the values in 16 bit 2's complement form to unsigned form
  if (hx > 0x07FF) hx = 0xFFFF - hx;
  if (hz > 0x07FF) hz = 0xFFFF - hz;
  if (hy > 0x07FF) hy = 0xFFFF - hy;

  var heading = 0.0;

  // This logic taken from https://github.com/D1W0U/Arduino-HMC5983/blob/master/HMC5983.cpp
  if (hy > 0) heading = 90.0 - math.atan(hx / hy) * 180.0 / math.PI;
  if (hy < 0) heading = 270.0 - math.atan(hx / hy) * 180.0 / math.PI;
  if (hy == 0 && hx < 0) heading = 180;
  if (hy == 0 && hx > 0) heading = 0;

  // Update heading
  compass.status.hdg = heading;

  // Then update timestamp
  compass.status.timestamp = new Date();
}

module.exports = CompassHMC5983;
