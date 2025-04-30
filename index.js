import { createApp } from "vue";
import { GraffitiLocal } from "@graffiti-garden/implementation-local";
import { GraffitiRemote } from "@graffiti-garden/implementation-remote";
import { GraffitiPlugin } from "@graffiti-garden/wrapper-vue";

createApp({
  data() {
    return {
      myMessage: "",
      myGroupChat: "",
      sending: false,
      creating: false,
      channels: ["designftw"],
      selectedChannel: null,
      editingMessageID: null,
      editedMessage: "",
      editingGroupChatID: null,
      editedGroupChat: "",
      leftGroupChats: [],
    };
  },

  methods: {
    async sendMessage(session) {
      if (!this.myMessage || !this.selectedChannel) return;

      this.sending = true;

      await this.$graffiti.put(
        {
          value: {
            content: this.myMessage,
            published: Date.now(),
          },
          channels: [this.selectedChannel],
        },
        session,
      );

      this.sending = false;
      this.myMessage = "";

      // Refocus the input field after sending the message
      await this.$nextTick();
      this.$refs.messageInput.focus();
      
    },

    async createGroupChat(session) {
      if (!this.myGroupChat) return;

      this.creating = true;

      await this.$graffiti.put({
        value: { 
          activity: 'Create',
          object: {
            type: 'Group Chat',
            name: this.myGroupChat,
            channel: crypto.randomUUID(), // This creates a random string
          }},
        channels: ["designftw"],
      }, session);

      this.myGroupChat = "";
      this.creating = false;
    },

    startEditing(message) {
      this.editingMessageID = message.url;
      this.editedMessage = message.value.content;
    },

    async submitEdit(message) {
      if (!this.editedMessage.trim()) return;
      await this.$graffiti.patch({
        value: [
          {
            op: "replace",
            path: "/content",
            value: this.editedMessage,
          },
          {
            op: "add",
            path: "/edited",
            value: Date.now(),
          }
        ]
      },
      message,
      this.$graffitiSession.value
    );
    this.editingMessageID = null;
    this.editedMessage = "";
    },
    
    async editMessage(message, session, editedMessage) {
      await this.$graffiti.patch(
        {
            value: [
              {
                op: "replace",
                path: "/content",
                value: editedMessage 
              }
            ]
        },
        message,
        session,
    );
    },

    // async clearAll() {
    //   if (confirm("Are you sure you want to delete all chats and messages? This cannot be undone.")) {
    //     await this.$graffiti.store.clear();
    //   }
    // },

    async deleteMessage(message) {
      const confirmDelete = confirm("Delete this message?");
      if (!confirmDelete) return;

      await this.$graffiti.delete(message, this.$graffitiSession.value);
    },

    // very similar to editing message methods above

    startGroupChatEditing(chat) {
      this.editingGroupChatID = chat.url;
      this.editedGroupChat = chat.value.object.name;
    },

    async submitGroupChatEdit(chat) {
      if (!this.editedGroupChat.trim()) return;
      await this.$graffiti.patch({
        value: [
          {
            op: "replace",
            path: "/object/name",
            value: this.editedGroupChat,
          }
        ]
      },
      chat,
      this.$graffitiSession.value
    );
    this.editingGroupChatID = null;
    this.editedGroupChat = "";
    },

    async deleteGroupChat(chat) {
      const confirmDelete = confirm("Delete this group chat?");
      if (!confirmDelete) return;

      await this.$graffiti.delete(chat, this.$graffitiSession.value);
    },

    leaveGroupChat(chat) {
      const channel = chat.value.object.channel;
      if (!this.leftGroupChats.includes(channel)) {
        this.leftGroupChats.push(channel);
      }
      localStorage.setItem("leftGroupChats", JSON.stringify(this.leftGroupChats));
    },

    joinGroupChat(chat) {
      const channel = chat.value.object.channel;
      this.leftGroupChats = this.leftGroupChats.filter(c => c !== channel);
      localStorage.setItem("leftGroupChats", JSON.stringify(this.leftGroupChats)); // saves it 
    }
    
  },

  mounted() {
    const stored = localStorage.getItem("leftGroupChats");
    if (stored) {
      try {
        this.leftGroupChats = JSON.parse(stored);
      }
     catch (e) {
      console.warn("Could not parse leftGroupChats from localStorage:", e);
    }
  }}
})
  .use(GraffitiPlugin, {
    graffiti: new GraffitiLocal(),
    // graffiti: new GraffitiRemote(),
  })
  .mount("#app");
