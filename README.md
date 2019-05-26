# DroneView
DroneView

Installing NodeJS on Raspberry Pi
----------------------------------
Follow instructions from https://www.instructables.com/id/Install-Nodejs-and-Npm-on-Raspberry-Pi/

Then add following packages:

npm install serialport
npm install readline-sync
npm install mavlink
npm install gps
npm install i2c-bus
npm install assert
npm install math
npm install node-onvif

# Add following line to /home/pi/.bashrc file
export NODE_PATH=/usr/local/lib/node_modules

# Add following line to /etc/rc.local file so that we automatically start
# our DroneView program upon startup. These lines should be before 'exit(0)'
export NODE_PATH=/usr/local/lib/node_modules
sleep 5 && node /home/pi/git/DroneView/Source/DroneView.js > /tmp/DroneView.log 2>&1 &

# In order to Auto launch VLC
  sudo nano /etc/xdg/lxsession/LXDE-pi/autostart
# and enter following line   
  @/usr/bin/vlc /home/pi/Desktop/Camera.xspf

Other Raspberry Pi Configuration:
---------------------------------
- Enable I2C_1
- Enable UART
- Disable UART logging by the OS
- Enable SSH and VNC
- Connect to Wifi
- Setup static IP on the Ethernet Interface eth0

  Add following lines to /etc/dhcpcd.conf

    #---------------------------------------------------------------------
    # DroneView static IP configuration:
    #

    interface eth0
    static ip_address=192.168.0.100/24
    static routers=10.0.0.1
    static domain_name_servers=8.8.8.8

- Setup DHCP on eth0

  Add following lines to /etc/dhcp/dhcpd.conf

    #----------------------------------------------------------
    # DroneView configuration
    #

    subnet 192.168.0.0 netmask 255.255.255.0 {
       range 192.168.0.101 192.168.0.120;
       option routers 10.0.0.1;
       option domain-name-servers 8.8.8.8;
    }
