////////////////////////////////////////////////////////////////////////////////
//
//						Copyright 2019 xxxxxxx, xxxxxxx
//	File:	DroneConnect.js
//	Author:	Bala B. (bhat.balasubramanya@gmail.com)
//	Description: Program to read Heading value from BMP180 Barometer module
//
////////////////////////////////////////////////////////////////////////////////

const I2C     = require('i2c-bus');
const assert  = require('assert');
const Config  = require('./Config');

const REFRESH_INTERVAL_MS = 1000;

//
// From BMP180 datasheet
// https://cdn-shop.adafruit.com/datasheets/BST-BMP180-DS000-09.pdf
//
const BMP180_ADDR           = 0x77;
const BMP180_CHIP_ID        = 0x55;

const REG_OUT_XLSB          = 0xF8;
const REG_OUT_LSB           = 0xF7;
const REG_OUT_MSB           = 0xF6;
const REG_CTRL_MEAS         = 0xF4;
const REG_SOFT_RESET        = 0xE0;
const REG_ID                = 0xD0;
const REG_CALIB_21          = 0xBF;
const REG_CALIB_00          = 0xAA;

const CMD_SOFT_RESET        = 0xB6;
const OSS                   = 3;      // Oversampling setting of 8 samples per measurement
// const OSS                   = 0;     // Test
const CMD_START_TEMP_MEAS   = ((1 << 5) | (OSS << 6) | 0x0E);  // Start Temperature measurement, 8 samples
const CMD_START_PRES_MEAS   = ((1 << 5) | (OSS << 6) | 0x14);  // Start Pressure measurement, 8 samples

const BUS_NUM               = 1;        // We are using I2C_1 bus on Raspberry Pi

//------------------------------------------------------------------------------
//        Caliberation Data [0..21]
//------------------------------------------------------------------------------
class CaliberationData {
    constructor() {
      this.AC1  = 0;
      this.AC2  = 0;
      this.AC3  = 0;
      this.AC4  = 0;
      this.AC5  = 0;
      this.AC6  = 0;
      this.B1   = 0;
      this.B2   = 0;
      this.MB   = 0;
      this.MC   = 0;
      this.MD   = 0;
    }
}

var caliberationData = new CaliberationData;

//------------------------------------------------------------------------------
//        CompassStatus class
//------------------------------------------------------------------------------
class CameraBaroStatus {
    constructor() {
      this.timestamp = null;
      this.temperature = 0.0;
      this.pressure = 0.0;
      this.altitude = 0.0;
    }
}

//------------------------------------------------------------------------------
//        BaroBMP180 class
//------------------------------------------------------------------------------
class BaroBMP180 {

  constructor() {

    this.status = new CameraBaroStatus;

    // Initial configuration happens synchronously
    this.i2cbus = I2C.open(BUS_NUM, (err) => {

      if(err) throw err;

      // Read the Chip ID and make sure it is right
      const cmdSetRegPtr = Buffer.from([REG_ID]);
      this.i2cbus.i2cWrite(BMP180_ADDR, cmdSetRegPtr.length, cmdSetRegPtr, () => {
        var regId = Buffer.from([0]);
        this.i2cbus.i2cRead(BMP180_ADDR, regId.length, regId, () => {
          if(regId[0] != BMP180_CHIP_ID) {
            throw 'Unexpected Chip ID';
          }
          setImmediate(resetDevice, this);
        });
      });
    });
  };
}

function resetDevice(baro)
{
  const cmdSoftReset = Buffer.from([REG_SOFT_RESET, CMD_SOFT_RESET]);
  baro.i2cbus.i2cWrite(BMP180_ADDR, cmdSoftReset.length, cmdSoftReset, () => {
    // Wait sometime for reset to complete
    setTimeout(readCaliberationData, 50, baro);
  });
}

function readCaliberationData(baro)
{
  // Set oversampling ratio of the pressure measurement
  // (00b: single, 01b: 2 times, 10b: 4 times, 11b: 8 times)
  const cmdSetRegPtr = Buffer.from([REG_CALIB_00]);
  baro.i2cbus.i2cWrite(BMP180_ADDR, cmdSetRegPtr.length, cmdSetRegPtr, () => {

    // Caliberation Data [0..21]
    var caliberationBuf = Buffer.alloc(22);

    baro.i2cbus.i2cRead(BMP180_ADDR, caliberationBuf.length, caliberationBuf, () => {

      // console.log(caliberationBuf);

      caliberationData.AC1  = caliberationBuf.readInt16BE(0);
      caliberationData.AC2  = caliberationBuf.readInt16BE(2);
      caliberationData.AC3  = caliberationBuf.readInt16BE(4);
      caliberationData.AC4  = caliberationBuf.readUInt16BE(6);
      caliberationData.AC5  = caliberationBuf.readUInt16BE(8);
      caliberationData.AC6  = caliberationBuf.readUInt16BE(10);
      caliberationData.B1   = caliberationBuf.readInt16BE(12);
      caliberationData.B2   = caliberationBuf.readInt16BE(14);
      caliberationData.MB   = caliberationBuf.readInt16BE(16);
      caliberationData.MC   = caliberationBuf.readInt16BE(18);
      caliberationData.MD   = caliberationBuf.readInt16BE(20);

      // Test Data
      // caliberationData.AC1  = 408;
      // caliberationData.AC2  = -72;
      // caliberationData.AC3  = -14383;
      // caliberationData.AC4  = 32741;
      // caliberationData.AC5  = 32757;
      // caliberationData.AC6  = 23153;
      // caliberationData.B1   = 6190;
      // caliberationData.B2   = 4;
      // caliberationData.MB   = -32768;
      // caliberationData.MC   = -8711;
      // caliberationData.MD   = 2868;

      // console.log(caliberationData);
      setInterval(startTempMeasurement, REFRESH_INTERVAL_MS, baro);
    });
  });
}

function startTempMeasurement(baro)
{
  // console.log('startTempMeasurement');

  const cmdStartMeas = Buffer.from([REG_CTRL_MEAS, CMD_START_TEMP_MEAS]);
  baro.i2cbus.i2cWrite(BMP180_ADDR, cmdStartMeas.length, cmdStartMeas, () => {
    // It takes 25.5ms to measure Temperature and Pressure at oversampling rate of 8
    setTimeout(readTemperature, 40, baro);
  });
}

function readTemperature(baro)
{
  // console.log('readTemperature');

  const cmdSetRegPtr = Buffer.from([REG_OUT_MSB]);
  baro.i2cbus.i2cWrite(BMP180_ADDR, cmdSetRegPtr.length, cmdSetRegPtr, () => {
    var temperatureBuf = Buffer.alloc(2);
    baro.i2cbus.i2cRead(BMP180_ADDR, temperatureBuf.length, temperatureBuf, () => {
      const UT = temperatureBuf.readUInt16BE(0);
      // const UT = 27898;  // Test Data
      setImmediate(startPressureMeasurement, baro, UT);
    });
  });
}

function startPressureMeasurement(baro, UT)
{
  // console.log('startPressureMeasurement');

  const cmdStartMeas = Buffer.from([REG_CTRL_MEAS, CMD_START_PRES_MEAS]);
  baro.i2cbus.i2cWrite(BMP180_ADDR, cmdStartMeas.length, cmdStartMeas, () => {
    // It takes 25.5ms to measure Temperature and Pressure at oversampling rate of 8
    setTimeout(readPressure, 40, baro, UT);
  });
}

function readPressure(baro, UT)
{
  // console.log('readPressure');

  const cmdSetRegPtr = Buffer.from([REG_OUT_MSB]);
  baro.i2cbus.i2cWrite(BMP180_ADDR, cmdSetRegPtr.length, cmdSetRegPtr, () => {
    var pressureBuf = Buffer.alloc(3);
    baro.i2cbus.i2cRead(BMP180_ADDR, pressureBuf.length, pressureBuf, () => {
      const UP = ((pressureBuf[0] << 16) |
                  (pressureBuf[1] << 8) |
                  (pressureBuf[2])) >> (8 - OSS);

      // const UP = 23843; // Test Data
      setImmediate(calculateTruePrssure, baro, UT, UP);
    });
  });
}

function calculateTruePrssure(baro, UT, UP)
{
  // console.log('UT: ' + UT);
  // console.log('UP: ' + UP);

  const AC1  = caliberationData.AC1;
  const AC2  = caliberationData.AC2;
  const AC3  = caliberationData.AC3;
  const AC4  = caliberationData.AC4;
  const AC5  = caliberationData.AC5;
  const AC6  = caliberationData.AC6;
  const B1  = caliberationData.B1;
  const B2  = caliberationData.B2;
  const MB  = caliberationData.MB;
  const MC  = caliberationData.MC;
  const MD  = caliberationData.MD;

  // First calculate True Temperature
  var X1 = ((UT - AC6) * AC5) >> 15;
  // console.log('X1: ' + X1);
  var X2 = ((MC * (1 << 11)) / (X1 + MD)) << 0;
  // console.log('X2: ' + X2);
  const B5 = (X1 + X2);
  // console.log('B5: ' + B5);
  const TT = (B5 + 8) >> 4;     // True Temperature in degrees in 1/10th of a degree
  // console.log('TT: ' + TT);
  baro.status.temperature = TT / 10.0;       // Temperature in degrees
  // console.log('Temperature (degrees): ' + baro.temperature);

  const B6 = B5 - 4000;
  // console.log('B6: ' + B6);

  X1 = (B2 * ((B6 * B6) >> 12)) >> 11;
  // console.log('X1: ' + X1);
  X2 = (AC2 * B6) >> 11;
  // console.log('X2: ' + X2);
  X3 = X1 + X2;
  // console.log('X3: ' + X3);
  const B3 = (((AC1 * 4 + X3) * (1 << OSS)) + 2) >> 2;
  // console.log('B3: ' + B3);

  X1 = (AC3 * B6) >> 13;
  // console.log('X1: ' + X1);
  X2 = (B1 * ((B6 * B6) >> 12)) >> 16;
  // console.log('X2: ' + X2);
  X3 = ((X1 + X2) + 2) >> 2;
  // console.log('X3: ' + X3);
  const B4 = (AC4 * (X3 + 32768)) >> 15;
  // console.log('B4: ' + B4);

  const B7 = ((UP - B3) * (50000 >> OSS));
  // console.log('B7: ' + B7);

  var p;
  if(B7 < 0x80000000) {
    p = (B7 * 2) / B4;
  }
  else {
    p = (B7 / B4) * 2;
  }
  p = (p << 0);           // Convert to Integer
  // console.log('p: ' + p);

  X1 = (p >> 8) * (p >> 8);
  // console.log('X1: ' + X1);
  X1 = (X1 * 3038) >> 16;
  // console.log('X1: ' + X1);
  X2 = (-7357 * p) >> 16;
  // console.log('X2: ' + X2);
  const TP = p + ((X1 + X2 + 3791) >> 4);     // True pressure
  // console.log('TP: ' + TP);
  baro.status.pressure = TP;                         // In Pa units

  const ALT = 44330 * (1 - Math.pow((TP / Config.PressureAtSeaLevel), (1 / 5.255)));
  baro.status.altitude = ALT;
  // console.log('Altitude (meters): ' + baro.altitude);

  // To calculate PressureAtSeaLevel, we need a known TP and Altitude
  // const P0 = TP / Math.pow((1 - (10.47 / 44330)), 5.255);
  // console.log('P0: ' + P0);

  // Update timestamp
  baro.status.timestamp = new Date();
}

// var cameraBaroStatus = new BaroBMP180;

module.exports = BaroBMP180;
