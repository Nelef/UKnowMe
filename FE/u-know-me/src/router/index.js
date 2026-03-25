import { createWebHistory, createRouter } from "vue-router";
import { useAccountStore } from "@/stores/land/account";
const LandPageView = () => import('@/views/land/LandPageView.vue')
const ChatView = () => import('@/views/chat/ChatView.vue')
const MainView = () => import('@/views/main/MainView.vue')
const AdminView = () => import('@/views/admin/AdminView.vue')
const Test2View = () => import('@/views/land/Test2View.vue')
const NotFound404 = () => import('@/views/NotFound404.vue')

const routes = [
//   {
//     path: "/경로",
//     name: "이름",
//     component: import해온 컴포넌트,
//   },
  {
    path: "/",
    name: 'home',
    component: LandPageView,
  },
  {
    path: "/chat",
    name: 'chat',
    component: ChatView,
  },
  {
    path: "/main",
    name: 'main',
    component: MainView,
  },
  {
    path: "/admin",
    name: 'admin',
    component: AdminView,
  },
  {
    path: "/beta",
    name: 'beta',
    component: Test2View,
  },
  {
    path: '/404',
    name: 'NotFound404',
    component: NotFound404
  },
  {
    path: '/:notPage(.*)',
    redirect: '/404',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async(to, from, next) => {
  const account = useAccountStore()
  // 이전 페이지에서 발생한 에러메시지 삭제
  account.authError = {
    login: 0,
  }

  const noAuthPages = ['home', 'NotFound404']

  const isAuthRequired = !noAuthPages.includes(to.name)

  if ("admin" == to.name) {
    await account.fetchCurrentUser();

    if (account.getRole == "ROLE_MANAGER") {
      next();
      return;
    }
    
    alert("관리자만 접근할 수 있는 페이지입니다!");

    if (account.isLoggedIn) next({ name: 'main' });
    else next({ name: 'home' });

    return;
  } 
  
  if (isAuthRequired && !account.isLoggedIn) {
    // alert("로그인이 필요한 페이지입니다!")
    // next({ name: 'home' })
    next()
  } else {
    next()
  }

  if (!isAuthRequired && account.isLoggedIn) {
    next({ name: to.name })
  }
})

export default router; 
