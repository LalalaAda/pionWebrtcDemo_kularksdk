import Vue from "vue";
import VueRouter, { RouteConfig } from "vue-router";
import Home from "../views/Home.vue";

Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
  {
    path: "/",
    name: "Home",
    redirect: "/join"
  },
  {
    path: "/about",
    name: "About",
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () =>
      import(/* webpackChunkName: "about" */ "../views/About.vue")
  },
  {
    path: "/join",
    name: "Join",
    component: () => import(/* webpackChunkName: "join" */ "../views/Join.vue")
  },
  {
    path: "/:id",
    name: "Meeting",
    component: Home
  }
];

const router = new VueRouter({
  routes
});

export default router;
