let socketServer = null;

const setSocketServer = (server) => {
  socketServer = server;
};

const getSocketServer = () => socketServer;

module.exports = { getSocketServer, setSocketServer };
