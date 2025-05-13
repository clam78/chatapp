import { createApp } from "vue";
// import { GraffitiLocal } from "@graffiti-garden/implementation-local";
import { GraffitiRemote } from "@graffiti-garden/implementation-remote";
import { GraffitiPlugin } from "@graffiti-garden/wrapper-vue";

const raw = localStorage.getItem("graffitiIdentity");

const identity = raw ? JSON.parse(raw) : undefined;
const actor = identity?.actor;

// const graffiti = new GraffitiLocal(identity);
const graffiti = new GraffitiRemote("https://pod.graffiticode.com", identity);

const actorFromStorage = actor || null;

const leftKey = `leftGroupChats_${actorFromStorage}` // track if someone left a groupchat


const app = createApp({
  data() {
    return {
      channels: JSON.parse(localStorage.getItem("channels") || '["designftw"]'),
      myMessage: "",
      myGroupChat: "",
      sending: false,
      creating: false,
      selectedChannel: null,
      editingMessageID: null,
      editedMessage: "",
      editingGroupChatID: null,
      editedGroupChat: "",
      leftGroupChats: [],
      loginStage: actorFromStorage ? "chat" : "check",
      
      name: "",
      email: "",
      pronouns: "",
      password: "",
      sleep: "",
      tidiness: "",
      guests: "",
      enteredPassword: "",
      loginError: "",
      emailError: "",
      currentUser: "",
      users: JSON.parse(localStorage.getItem("users") || '{}'), // all users

      searchQuery: "",
      selectedProfile: null,
    };
  },

  computed: {
    filteredUsers() {
      const q = this.searchQuery.trim().toLowerCase();
      if (!q) return [];
      return Object.values(this.users)
        .filter(u => u.name.toLowerCase().includes(q));
    },

    directMessages() {
      const session = this.$graffitiSession.value;
      if (!session?.actor) return [];

      const me = this.$graffitiSession.value.actor;
      
      return this.channels
        .filter(ch => {
          if (!ch.startsWith("dm-")) return false;
          const [, a, b] = ch.split("-");
          return a === me || b === me;
        })
        
          .map(ch => {
          // channel is "dm-Alice-Bob" form
          const [, a, b] = ch.split("-");
          const other = a === me ? b : a;
          return { channel: ch, name: other };
        });
    },
  
    dormChats() {
      return this.channels.filter(ch => !ch.startsWith("dm-"));
    }
  },

  methods: {
    checkUser() {
      if (!this.email.trim()) {
        this.emailError = "Please enter an email address";
        return;
      }
      this.emailError = "";

      if (this.email in this.users) {
        this.loginStage = 'login'; // user exists
      } else {
        this.loginStage = 'create1'; // new user
      }
    },

    createAccount() {
        if (!this.name || !this.email || !this.password) {
            alert("Please fill in all fields.");
            return;
        }

        if (this.currentUser) {

          this.users[this.currentUser].name = this.name;
          this.users[this.currentUser].pronouns = this.pronouns;
          } else {
          this.users[this.email] = {
            name: this.name,
            email: this.email,
            pronouns: this.pronouns,
            password: this.password
          };
          this.currentUser = this.email;
          }


        localStorage.setItem("users", JSON.stringify(this.users));

        const identity = { actor: this.users[this.email].name, credential: null };

        localStorage.setItem("graffitiIdentity", JSON.stringify(identity));
        
        this.$graffitiSession.value = identity;

        this.loginStage = "create2";
        // this.selectedChannel = this.channels[0];

    },

    createAccount2() {

      const key = this.currentUser;
      Object.assign(this.users[key], {
        sleep: this.sleep,
        tidiness: this.tidiness,
        guests: this.guests
      });

      localStorage.setItem("users", JSON.stringify(this.users));

      const identity = { actor: this.users[this.email].name, credential: null };

      localStorage.setItem("graffitiIdentity", JSON.stringify(identity));
      
      this.$graffitiSession.value = identity;

      this.loginStage = "chat";
      this.selectedChannel = this.channels[0];

      this.selectedProfile = null;

  },



    loginWithPassword() {
        if (this.users[this.email]?.password === this.enteredPassword) {
          this.loginError = "";

          this.currentUser = this.email;

          const identity = { actor: this.users[this.email].name, credential: null };
          
          localStorage.setItem("graffitiIdentity", JSON.stringify(identity));

          this.$graffitiSession.value = identity;

          this.loginStage = "chat";
          this.selectedChannel = this.channels[0];

        } else {
          this.loginError = "Incorrect password, please try again.";
        }
      },


    async sendMessage() {
      console.log(
        "sendMessage called →",
        { msg: this.myMessage, channel: this.selectedChannel, session: this.$graffitiSession.value }
      );
    
      const session = this.$graffitiSession.value;
      if (!session?.actor || !this.myMessage || !this.selectedChannel) {
        console.warn("Aborting sendMessage; missing data");
        return;
      }
    
      this.sending = true;
      try {
        await this.$graffiti.put(
          {
            value: {
              content: this.myMessage,
              published: Date.now(),
            },
            channels: [this.selectedChannel],
          },
          session
        );
        
      } catch (err) {
        console.error("Failed to send message:", err);
        alert("Error sending message: " + err.message);
      } finally {
        // clear out the input on success
        this.myMessage = "";
        this.sending = false;
        await this.$nextTick();
        this.$refs.messageInput.focus();

      }
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
            channel: crypto.randomUUID(),
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
      localStorage.setItem(leftKey, JSON.stringify(this.leftGroupChats));

    },

    joinGroupChat(chat) {
      const channel = chat.value.object.channel;
      this.leftGroupChats = this.leftGroupChats.filter(c => c !== channel);
      localStorage.setItem(leftKey, JSON.stringify(this.leftGroupChats)); // saves it 
    },

    login() {
        
      const identity = { actor: this.users[this.currentUser].name, credential: null };

      localStorage.setItem("graffitiIdentity", JSON.stringify(identity));

      this.loginStage = "chat";
      this.selectedChannel = this.channels[0];

      location.reload();
      },



    logout() {

        localStorage.removeItem("graffitiIdentity");
        location.reload();
      },
    
    viewProfile(user) {
      this.selectedProfile = user;
    },

    clearProfile() {
      this.selectedProfile = null;
    },

    startDirectMessage(user) {
      // build a channel ID, same for both parties
      const me = this.$graffitiSession.value.actor;
      const them = user.name;
      const pair = [me, them].sort();
      const dmChannel = `dm-${pair[0]}-${pair[1]}`;
  
      if (!this.channels.includes(dmChannel)) {
        this.channels.push(dmChannel);
        localStorage.setItem("channels", JSON.stringify(this.channels));
      }
      
      this.selectedChannel = dmChannel;
  
      // go to chat
      this.selectedProfile = null;
    },

    editProfile() {

      const actor = this.$graffitiSession.value?.actor;
      if (!actor) return;
  
      const key = Object.keys(this.users).find(email => this.users[email].name === actor);
      const user = key && this.users[key];
      if (!user) return;
      
      this.email = key;
      this.name = user.name;
      this.pronouns = user.pronouns || "";
      this.password = user.password || "";
      this.sleep = user.sleep || "";
      this.tidiness = user.tidiness || "";
      this.guests = user.guests || "";
      
      this.loginStage = "create1";
    },
  
    
  },

  mounted() {
    console.log("session ref:", this.$graffitiSession);
    console.log("session.value:", this.$graffitiSession.value);
    console.log("actor:", this.$graffitiSession.value?.actor);

    const raw = localStorage.getItem("graffitiIdentity");
    if (raw) {
      this.$graffitiSession.value = JSON.parse(raw);
      this.loginStage = "chat";
      this.selectedChannel = this.channels[0];
    }


    if (actorFromStorage) {
        this.selectedChannel = this.channels[0];
      }


    if (this.$graffitiSession.value) {
        this.loginStage = "chat";              
        this.selectedChannel = this.channels[0]; 
      }
  }
});
app.use(GraffitiPlugin, { graffiti });

app.mount("#app");
