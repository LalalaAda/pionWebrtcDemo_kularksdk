<template>
  <v-container class="d-flex justify-center">
    <v-card elevation="2" v-if="id" :loading="loading" class="formbox">
      <v-card-title>输入您的姓名以进入</v-card-title>
      <v-form ref="form1" v-model="canSubmit">
        <v-container>
          <v-row>
            <v-col>
              <v-text-field
                v-model="form1.name"
                label="姓名"
                placeholder="请输入您的姓名"
                :rules="validateName"
                outlined
                required
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-btn
                large
                :disabled="!canSubmit || loading"
                :loading="loading"
                color="success"
                @click="submitForm('form1')"
              >
                加入
              </v-btn>
            </v-col>
          </v-row>
        </v-container>
      </v-form>
    </v-card>
    <v-card elevation="2" v-else :loading="loading" class="formbox">
      <v-card-title>加入会议</v-card-title>
      <v-form ref="form2" v-model="canSubmit">
        <v-container>
          <v-row>
            <v-col>
              <v-text-field
                v-model="form2.roomid"
                label="会议ID"
                placeholder="请输入会议ID"
                :rules="validateRoomId"
                type="number"
                outlined
                required
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-text-field
                v-model="form2.name"
                label="姓名"
                placeholder="请输入您的姓名"
                :rules="validateName"
                outlined
                required
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-btn
                large
                :disabled="!canSubmit || loading"
                :loading="loading"
                color="success"
                @click="submitForm('form2')"
              >
                加入
              </v-btn>
            </v-col>
          </v-row>
        </v-container>
      </v-form>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";

@Component
export default class Join extends Vue {
  id = "";
  form1 = {
    name: ""
  };
  form2 = {
    roomid: "",
    name: ""
  };

  @Watch("$route")
  onRouterChange() {
    const info = this.$route.query;
    if (info.m) {
      this.id = info.m ? (info.m as string) : "";
    } else {
      this.id = "";
    }
    this.$nextTick(() => {
      this.id ? this.resetForm("form1") : this.resetForm("form2");
    });
  }
  loading = false;

  created() {
    this.onRouterChange();
  }
  validateName = [(v: unknown) => !!v || "请输入姓名！"];
  validateRoomId = [
    (v: number) => !!v || "请输入会议ID",
    (v: number) => {
      if (String(v).length < 12 && String(v).length > 1) {
        return true;
      }
      return "您的会议id是一个9、10或11位数字";
    }
  ];

  canSubmit = false;
  handleFormChange(_: string, r: boolean) {
    this.canSubmit = r;
  }

  submitForm(formName: string) {
    const valid = (this.$refs[formName] as Vue & {
      validate: () => boolean;
    }).validate();
    if (valid) {
      this.loading = true;
      this.joinMeeting();
    }
  }
  resetForm(formName: string) {
    (this.$refs[formName] as Vue & { reset: () => boolean }).reset();
  }

  joinMeeting() {
    let name = "";
    let id = this.id || "";
    if (this.id) {
      name = this.form1.name;
    } else {
      id = this.form2.roomid.toString();
      name = this.form2.name;
    }
    this.$store.dispatch("user/login", { name, roomId: id });
    this.$router.push({ path: `/${id}` });
  }
}
</script>

<style lang="scss" scoped>
.formbox {
  width: 360px;
  margin: 20px auto;
  flex: unset;
  .subbtn {
    width: 100%;
    margin: 20px auto 0;
  }
}
</style>
