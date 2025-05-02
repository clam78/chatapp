import { createApp } from "vue";
import { GraffitiLocal } from "@graffiti-garden/implementation-local";
import { GraffitiRemote } from "@graffiti-garden/implementation-remote";
import { GraffitiPlugin } from "@graffiti-garden/wrapper-vue";

const raw = localStorage.getItem("graffitiIdentity");

// const actor = raw ? JSON.parse(raw).actor : undefined;
const identity = raw ? JSON.parse(raw) : undefined;
const actor = identity?.actor;

// let actor;
// if (raw) {
// //   try {
//     // const { actor: a } = JSON.parse(raw);
//     // if (typeof a === "string") actor = a;
//     actor = JSON.parse(raw).actor;
// //   } catch {}
// }

// const graffiti = new GraffitiLocal(actor);
const graffiti = new GraffitiLocal(identity);

// const rawIdentity = localStorage.getItem("graffitiIdentity");
// const actorFromStorage = rawIdentity
//   ? JSON.parse(rawIdentity).actor
//   : null;
const actorFromStorage = actor || null;

const leftKey = `leftGroupChats_${actorFromStorage}` // track if someone left a groupchat


const app = createApp({
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
      
      loginStage: actorFromStorage ? "chat" : "check",
    //   selectedChannel: actorFromStorage ? this.channels[0] : null,

    //   loginStage: "check",
      name: "",
      email: "",
      pronouns: "",
      password: "",
      enteredPassword: "",
      currentUser: "",
      users: JSON.parse(localStorage.getItem("users") || '{}'), // all users
    };
  },

  methods: {
    checkUser() {
        if (this.email in this.users) {
          this.loginStage = 'login'; // user exists
        } else {
          this.loginStage = 'create'; // new user
        }
    },

    createAccount() {
        if (!this.name || !this.email || !this.password) {
            alert("Please fill in all fields.");
            return;
        }
        this.users[this.email] = {
            name: this.name,
            email: this.email,
            pronouns: this.pronouns,
            password: this.password,
        };
        // localStorage.setItem("users", JSON.stringify(this.users));
        // this.currentUser = this.email;

        // const identity = { actor: this.users[this.currentUser].name, credential: null };
        // localStorage.setItem("graffitiIdentity", JSON.stringify(identity));

        // this.loginStage = "chat";

        // console.log("Entered chat stage")

        // this.selectedChannel = this.channels[0];
        // // location.reload();

        const identity = { actor: this.users[this.email].name, credential: null };
        // this.$graffiti.setSession(identity);

        localStorage.setItem("graffitiIdentity", JSON.stringify(identity));

        // this.loginStage = "chat";
        // // console.log("Entered chat stage")
        // this.selectedChannel = this.channels[0];

        location.reload();

    },

    // loginWithPassword() {
    //     if (this.users[this.email]?.password === this.enteredPassword) {
    //         this.currentUser = this.email;
    //         this.startGraffitiSession()
    //     } else {
    //         alert("Incorrect password. Please try again.")
    //     }
    // },

    loginWithPassword() {
        if (this.users[this.email]?.password === this.enteredPassword) {
          this.currentUser = this.email;

          const identity = { actor: this.users[this.email].name, credential: null };
          localStorage.setItem("graffitiIdentity", JSON.stringify(identity));

        //   this.$graffitiSession.value = identity;

        //   this.loginStage = "chat";
          
        //   this.selectedChannel = this.channels[0];


          location.reload();


        } else {
          alert("Incorrect password.");
        }
      },

    // startGraffitiSession() {
    //     const identity = {
    //         actor: this.users[this.currentUser].name,
    //         credential: null
    //       };
    //       this.$graffiti.setSession(identity);
      
    //       localStorage.setItem("graffitiIdentity", JSON.stringify(identity));
    //       this.loginStage = "chat";
    //       this.selectedChannel = this.channels[0];
    // },

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
        
        // localStorage.setItem("graffitiIdentity", 
        //   JSON.stringify({ actor: this.users[this.currentUser].name, credential: null })
        // );

        // this.loginStage = "chat";
        // location.reload();

        const identity = { actor: this.users[this.currentUser].name, credential: null };
        // this.$graffiti.setSession(identity);

        localStorage.setItem("graffitiIdentity", JSON.stringify(identity));

        // this.$graffitiSession.value = identity;


        this.loginStage = "chat";
        this.selectedChannel = this.channels[0];

        location.reload();
      },

    // logout() {
    //     this.$graffiti.logout(this.$graffitiSession.value);
    //     localStorage.removeItem("graffitiIdentity");
    //     this.currentUser = "";
    //     this.loginStage = "check";
    //     this.selectedChannel = null;
    // },

    logout() {

        // this.$graffitiSession.value = null; // might remove later

        localStorage.removeItem("graffitiIdentity");
        // this.currentUser = "";
        // this.loginStage = "check";
        // this.selectedChannel = null;
        // location.reload();
        
        
        // this.loginStage = "check";
        // this.selectedChannel = null;
        // this.email = "";
        // this.enteredPassword = "";

        location.reload();
      },
    
  },

  mounted() {
    console.log("session ref:", this.$graffitiSession);
    console.log("session.value:", this.$graffitiSession.value);
    console.log("actor:", this.$graffitiSession.value?.actor);


    if (actorFromStorage) {
        this.selectedChannel = this.channels[0];
      }


    const raw = localStorage.getItem(leftKey);
    this.leftGroupChats = raw ? JSON.parse(raw) : [];

    // const stored = localStorage.getItem("leftGroupChats");
    // if (stored) {
    //   try {
    //     this.leftGroupChats = JSON.parse(stored);
    //   } catch (e) {
    //     console.warn("Could not parse leftGroupChats from localStorage:", e);
    //   }
    // }
    if (this.$graffitiSession.value) {
        this.loginStage = "chat";              
        this.selectedChannel = this.channels[0]; 
      }
  }
});
app.use(GraffitiPlugin, { graffiti });

app.mount("#app");
