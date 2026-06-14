module.exports = (client) => {
  client.ticketSystem = {
    create: async (guild, user, category) => {
      return { success: true };
    },
    close: async (channel) => {
      return { success: true };
    },
    addUser: async (channel, user) => {
      return { success: true };
    },
    removeUser: async (channel, user) => {
      return { success: true };
    }
  };
};