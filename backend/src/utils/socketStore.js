// Map of userId -> { socketId, lat, lng }
const activeSockets = new Map();
let ioInstance = null;

module.exports = {
  activeSockets,
  setIo: (io) => { ioInstance = io; },
  getIo: () => ioInstance
};
