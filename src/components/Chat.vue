<template>
  <div class="chat-panel">
    <div class="title-panel">
      <span>聊天室</span>
    </div>
    <div class="chat-history">
      <div>
        <div class="chatbubble-wrapper">
          <template v-for="msg in msgs">
            <template v-if="msg.type === 'send'">
              <div class="bubble-right" :key="msg.index">
                <div class="bubble-msg">
                  <p class="sender-name">{{ msg.name }}</p>
                  <div class="bubble-msgword">
                    <p class="pr">{{ msg.content }}</p>
                  </div>
                </div>
                <div class="bubble-head">
                  <i class="anticon">
                    <v-icon>mdi-account</v-icon>
                  </i>
                </div>
              </div>
            </template>
            <template v-if="msg.type === 'receive'">
              <div class="bubble-left" :key="msg.index">
                <div class="bubble-head">
                  <i class="anticon">
                    <v-icon>mdi-account</v-icon>
                  </i>
                </div>
                <div class="bubble-msg">
                  <p class="sender-name">{{ msg.name }}</p>
                  <div class="bubble-msgword">
                    <p class="pl">{{ msg.content }}</p>
                  </div>
                </div>
              </div>
            </template>
          </template>
        </div>
      </div>
    </div>
    <div class="chat-input">
      <v-text-field
        v-model="messageText"
        solo
        label="在此输入..."
        clearable
        dense
        hide-details="auto"
      ></v-text-field>
      <v-btn style="margin-left: 10px" @click="sendMessage">
        <v-icon>mdi-message-processing-outline</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class Chat extends Vue {
  msgs = [
    { type: "send", index: 0, name: "me", content: "🌹🤣👍😢🐱‍🏍😆" },
    {
      type: "receive",
      index: 1,
      name: "未知用户",
      content: "asdhkashfkshfzczxczxczxq2ewqdasfzczcvz"
    }
  ];
  @Prop() private username;
  messageText = "";

  sendMessage() {
    console.log(this.messageText);
  }

  mounted() {
    console.log("msg mounted");
  }
}
</script>

<style lang="scss" scoped>
.left-container {
  width: 320px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.title-chat {
  font-size: 16px;
  color: #fff;
  margin-left: 10px;
}

.chat-input {
  display: flex;
  flex-direction: row;
  width: 320px;
  padding: 10px;
  border-top-width: 1px;
  border-top-style: solid;
  border-top-color: #ddd;
  padding-bottom: 20px;
}

.bubble-left {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  margin-bottom: 16px;
  margin-left: 5px;
  font-size: 12px;
  text-align: left;
}

.bubble-right {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  margin-bottom: 16px;
  margin-right: 16px;
  font-size: 12px;
  text-align: right;
}

.bubble-middle {
  display: flex;
  flex-direction: row;
  justify-content: center;
  margin-bottom: 16px;
  margin-right: 5px;
}

.bubble-head {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  background-color: #fff;
}

.bubble-head i {
  font-size: 24px;
  color: #909090;
}

.sender-name {
  color: #fff;
  margin: 0;
  padding: 0;
  line-height: 1.2;
  &.l {
    text-align: left;
  }
  &.r {
    text-align: right;
  }
}

.bubble-msg {
  padding: 0px 10px;
}

.bubble-msgword {
  background-color: #fff;
  display: inline-block;
  margin-top: 6px;
  padding-top: 8px;
  padding-bottom: 8px;
  padding-left: 10px;
  padding-right: 10px;
  border-radius: 4px;
}

.bubble-msgword-middle {
  background-color: #fafafa;
  display: inline-block;
  margin-top: 6px;
  padding-top: 8px;
  padding-bottom: 8px;
  padding-left: 10px;
  padding-right: 10px;
  border-radius: 4px;
}

.pl {
  color: #262626;
  font-size: 14px;
  font-weight: 300;
  margin: 0px;
  text-align: left;
  word-break: break-all;
}

.pr {
  color: #262626;
  font-size: 14px;
  font-weight: 300;
  margin: 0px;
  text-align: right;
  word-break: break-all;
}

.pm {
  color: #8c8c8c;
  font-size: 12px;
  font-weight: 300;
  font-style: italic;
  margin: 0px;
  text-align: center;
  word-break: break-all;
}

.chat-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background-color: #4e4c4c;
}

.title-panel {
  display: flex;
  height: 36px;
  background-color: #4e4c4c;
  padding-top: 4px;
  border-bottom-width: 1px;
  border-bottom-style: solid;
  border-bottom-color: #ddd;
  color: white;
}

.chat-history {
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
}

.chatbubble-wrapper {
  margin-top: 10px;
  margin-bottom: 10px;
  overflow: auto;
  position: relative;
}
</style>
