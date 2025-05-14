import { createApp } from "vue";
// import { GraffitiLocal } from "@graffiti-garden/implementation-local";
import { GraffitiRemote } from "@graffiti-garden/implementation-remote";
import { GraffitiPlugin } from "@graffiti-garden/wrapper-vue";

const raw = localStorage.getItem("graffitiIdentity");

const identity = raw ? JSON.parse(raw) : undefined;
const actor = identity?.actor;

// const graffiti = new GraffitiLocal(identity);
const graffiti = new GraffitiRemote("https://pod.graffiti.garden", identity);

const actorFromStorage = actor || null;

const leftKey = `leftGroupChats_${actorFromStorage}` // track if someone left a groupchat


async function bootstrap() {
  
  const rawIdentity = localStorage.getItem("graffitiIdentity");
  if (rawIdentity) {
    const identity = JSON.parse(rawIdentity);
    if (!identity.credential) {
      await graffiti.login({ idp: "https://solidcommunity.net", prompt: "login" });
    }
  }

const app = createApp({
  data() {
    return {
      channels: JSON.parse(localStorage.getItem("channels") || "[]"),
      myMessage: "",
      myGroupChat: "",
      sending: false,
      creating: false,
      selectedChannel: null,
      editingMessageID: null,
      editedMessage: "",
      editingGroupChatID: null,
      editedGroupChat: "",
      leftGroupChats: JSON.parse(localStorage.getItem(`leftGroupChats_${actorFromStorage}`) || "[]"),
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

      dormNames: [
        "Baker",
        "Burton Conner",
        "East Campus",
        "MacGregor",
        "Maseeh",
        "McCormick",
        "New House",
        "New Vassar",
        "Next House",
        "Random",
        "Simmons"
      ],
      displayName: localStorage.getItem("displayName") || "",
    };
  },

  computed: {
    filteredUsers() {
      const q = this.searchQuery.trim().toLowerCase();
      if (!q) return [];
      // return Object.values(this.users)
      //   .filter(u => u.name.toLowerCase().includes(q));
      return Object.entries(this.users)
      .map(([id,u]) => ({ id, ...u }))
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
          // return { channel: ch, name: other };
          return {
                  channel: ch,
                  name: this.users[other]?.name || other.split("/").pop()
                };
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

    async createAccount() {
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
        
        // this.$graffitiSession.value = identity;
        // this.loginStage = "create2";

        // if (!this.$graffitiSession.value?.actor) {
        //   await this.$graffiti.login({ idp: "https://solidcommunity.net", prompt: "login" });
        // }

        localStorage.setItem("displayName", this.name);
        this.displayName = this.name;

        const session = this.$graffitiSession.value;
        localStorage.setItem(
          "loginIdentity",
          JSON.stringify({ webId: session.actor, credential: session.credential })
        );
        localStorage.setItem("displayName", JSON.stringify(this.name));

        this.$graffitiSession.value = identity;
        

        // this.users[ identity.actor ] = { name: identity.actor };
        // localStorage.setItem("users", JSON.stringify(this.users));

        // // new
        // const displayIdentity = {
        //   actor: this.name, 
        //   credential: null
        // };
        // this.$graffitiSession.value = displayIdentity;
        //

        this.loginStage = "create2";
        

    },

    createAccount2() {

      const key = this.currentUser;
      Object.assign(this.users[key], {
        sleep: this.sleep,
        tidiness: this.tidiness,
        guests: this.guests
      });
      localStorage.setItem("users", JSON.stringify(this.users));

      // const identity = { actor: this.users[this.email].name, credential: null };
      // localStorage.setItem("graffitiIdentity", JSON.stringify(identity));

      const saved = JSON.parse(localStorage.getItem("graffitiIdentity") || "{}");
      saved.actor = this.users[this.email].name;

      localStorage.setItem("displayName", this.users[this.email].name);
      this.displayName = this.users[this.email].name;


      localStorage.setItem("graffitiIdentity", JSON.stringify(saved));
      this.$graffitiSession.value.actor = saved.actor;

    
      // this.$graffitiSession.value = identity;

      this.loginStage = "chat";
      this.selectedChannel = this.dormNames[0];
      this.selectedProfile = null;

  },



  editcreateAccount() {
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

    // const identity = { actor: this.users[this.email].name, credential: null };
    // localStorage.setItem("graffitiIdentity", JSON.stringify(identity));
    // this.$graffitiSession.value = identity;

    const saved = JSON.parse(localStorage.getItem("graffitiIdentity") || "{}");
    saved.actor = this.users[this.email].name;

    localStorage.setItem("displayName", this.users[this.email].name);
    this.displayName = this.users[this.email].name;

    localStorage.setItem("graffitiIdentity", JSON.stringify(saved));
    this.$graffitiSession.value.actor = saved.actor;

    this.loginStage = "editingcreate2";

},

  

  async loginWithPassword() {
      if (this.users[this.email]?.password === this.enteredPassword) {
        this.loginError = "";

        this.currentUser = this.email;

        const identity = { actor: this.users[this.email].name, credential: null };
        
        localStorage.setItem("graffitiIdentity", JSON.stringify(identity));


        // this.loginStage = "chat";
        // if (!this.$graffitiSession.value?.actor) {
        //   await this.$graffiti.login({ idp: "https://solidcommunity.net", prompt: "login" });
        // }

        localStorage.setItem("displayName", this.name);
        this.displayName = this.name;

        const session = this.$graffitiSession.value;
        localStorage.setItem(
          "loginIdentity",
          JSON.stringify({ webId: session.actor, credential: session.credential })
        );
        localStorage.setItem("displayName", JSON.stringify(this.name));
        
        this.$graffitiSession.value = identity;

        // this.users[ identity.actor ] = { name: identity.actor };
        // localStorage.setItem("users", JSON.stringify(this.users));


        this.loginStage = "chat";
        this.selectedChannel = this.dormNames[0];

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

    // startGroupChatEditing(chat) {
    //   this.editingGroupChatID = chat.url;
    //   this.editedGroupChat = chat.value.object.name;
    // },

    // async submitGroupChatEdit(chat) {
    //   if (!this.editedGroupChat.trim()) return;
    //   await this.$graffiti.patch({
    //     value: [
    //       {
    //         op: "replace",
    //         path: "/object/name",
    //         value: this.editedGroupChat,
    //       }
    //     ]
    //   },
    //   chat,
    //   this.$graffitiSession.value
    // );
    // this.editingGroupChatID = null;
    // this.editedGroupChat = "";
    // },


    joinGroupChat(chat) {
      this.leftGroupChats = this.leftGroupChats.filter(c => c !== chat);
      localStorage.setItem(leftKey, JSON.stringify(this.leftGroupChats));
    },

    leaveGroupChat(chat) {
      if (!this.leftGroupChats.includes(chat)) {
        this.leftGroupChats.push(chat);
        localStorage.setItem(leftKey, JSON.stringify(this.leftGroupChats));
      }
    },

    login() {
        
      const identity = { actor: this.users[this.currentUser].name, credential: null };

      localStorage.setItem("graffitiIdentity", JSON.stringify(identity));

      this.loginStage = "chat";
      this.selectedChannel = this.dormNames[0];

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

    async startDirectMessage(user) {
      // build a channel ID, same for both parties
      const me = this.$graffitiSession.value.actor;
      const them = user.name;
      const pair = [me, them].sort();
      const dmChannel = `dm-${pair[0]}-${pair[1]}`;
  
      await this.$graffiti.put(
        {
          value: {
            activity: "Create",
            object: {
              type: "GroupChat",
              name: `${pair[0]} ↔ ${pair[1]}`, 
              channel: dmChannel
            }
          },
          channels: [ dmChannel ]
        },
        this.$graffitiSession.value
      );

      this.channels.push(dmChannel);
      localStorage.setItem("channels", JSON.stringify(this.channels));
      this.selectedChannel = dmChannel;


      // if (!this.channels.includes(dmChannel)) {
      //   this.channels.push(dmChannel);
      //   localStorage.setItem("channels", JSON.stringify(this.channels));
      // }
      
      // this.selectedChannel = dmChannel;
  
      // go to chat
      this.selectedProfile = null;
    },

    editProfile() {

      console.log("Edit profile called")

      // const actor = this.$graffitiSession.value?.actor;
      // if (!actor) return;

      const raw = localStorage.getItem("graffitiIdentity");
      if (!raw) {
        console.warn("no identity found in localStorage");
        return;
      }
      const { actor } = JSON.parse(raw);
      if (!actor) {
        console.warn("identity.actor is empty");
        return;
      }

      const key = Object
      .entries(this.users)
      .find(([email, u]) => u.name === actor)?.[0];
      if (!key) {
        console.warn("couldn't find a user record for", actor);
        return;
      }

      this.currentUser = key

      const user = this.users[key];

  
      // const key = Object.keys(this.users).find(email => this.users[email].name === actor);
      // const user = key && this.users[key];
      // if (!user) return;
      
      this.email = key;
      this.name = user.name;
      this.pronouns = user.pronouns || "";
      this.password = user.password || "";
      this.sleep = user.sleep || "";
      this.tidiness = user.tidiness || "";
      this.guests = user.guests || "";
      
      this.loginStage = "editingcreate1";
      console.log("entered editingcreate1 stage")
    },
    
  },

  async mounted() {
    const stored = localStorage.getItem("graffitiIdentity");
    if (stored) {
      const identity = JSON.parse(stored);
      // await graffiti.login({ idp: "https://solidcommunity.net" });
      
      this.$graffitiSession.value = identity;

      this.loginStage = "chat";
      this.selectedChannel = this.dormNames[0];

    }

    if (!localStorage.getItem("dormChatsSeeded")) {
      for (const dorm of this.dormNames) {
        await this.$graffiti.put({
          value: {
            activity: "Create",
            object: { type: "GroupChat", name: dorm, channel: dorm }
          },
          channels: [dorm]
        }, this.$graffitiSession.value);
        this.channels.push(dorm);
      }
      localStorage.setItem("channels", JSON.stringify(this.channels));
      localStorage.setItem("dormChatsSeeded", "true");
    }

    this.leftGroupChats = JSON.parse(
      localStorage.getItem(`leftGroupChats_${actorFromStorage}`) || "[]"
    );

    // const raw = localStorage.getItem("graffitiIdentity");
    // if (raw) {
    //   this.$graffitiSession.value = JSON.parse(raw);
    //   this.loginStage = "chat";
      
    //   this.selectedChannel = this.dormNames[0];
    // }

    // const actor = this.$graffitiSession.value?.actor;
    // this.leftGroupChats = JSON.parse(
    //   localStorage.getItem(`leftGroupChats_${actor}`) || "[]"
    // );

    // profiles for all users
    const { objects } = await this.$graffiti.discover(
      {
        channels: ["profiles"],
        schema: {
          properties: {
            value: {
              required: ["id","name","email"],
              properties: {
                id:       { type: "string" },
                name:     { type: "string" },
                email:    { type: "string" },
                pronouns: { type: "string" },
                sleep:    { type: "string" },
                tidiness: { type: "string" },
                guests:   { type: "string" }
              }
            }
          }
        }
      },
      this.$graffitiSession.value
    );
  
    // rebuild users
    const map = {};
    for (const o of objects) {
      const p = o.value;
      map[p.id] = {
        name:     p.name,
        email:    p.email,
        pronouns: p.pronouns,
        sleep:    p.sleep,
        tidiness: p.tidiness,
        guests:   p.guests,
        password: JSON.parse(localStorage.getItem("users") || "{}")[p.id]?.password || ""
      };
    }
    this.users = map;
    
  }
});
app.use(GraffitiPlugin, { graffiti });
app.mount("#app");
}

bootstrap();
