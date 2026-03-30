import { defineStore } from 'pinia'
import sr from '@/api/spring-rest'
import router from '@/router'
import axios from 'axios'
import { useLandStore } from './land'
import { useMainStore } from '../main/main'
import { useCookies } from "vue3-cookies";

const { cookies } = useCookies();
const TEST_ACCOUNT_FORCED_AVATAR_MAP = Object.freeze({
  test: 11,
  test2: 21,
});
const LOCAL_AVATAR_SELECTION_STORAGE_KEY = 'ukm-avatar-selection-map';
const getForcedAvatarSeqForUserId = (userId) =>
  TEST_ACCOUNT_FORCED_AVATAR_MAP[userId] || null;
const readLocalAvatarSelectionMap = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(LOCAL_AVATAR_SELECTION_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : {};
    return parsedValue && typeof parsedValue === 'object' ? parsedValue : {};
  } catch (error) {
    console.warn('로컬 아바타 선택값을 읽는 중 오류가 발생했습니다.', error);
    return {};
  }
};
const writeLocalAvatarSelectionMap = (selectionMap) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      LOCAL_AVATAR_SELECTION_STORAGE_KEY,
      JSON.stringify(selectionMap)
    );
  } catch (error) {
    console.warn('로컬 아바타 선택값을 저장하는 중 오류가 발생했습니다.', error);
  }
};
const getStoredAvatarSeqForUserId = (userId) => {
  if (!userId) {
    return null;
  }

  const selectionMap = readLocalAvatarSelectionMap();
  const storedValue = Number(selectionMap[userId]);
  return Number.isFinite(storedValue) && storedValue > 0 ? storedValue : null;
};
const persistAvatarSeqForUserId = (userId, avatarSeq) => {
  if (!userId || !avatarSeq) {
    return;
  }

  const selectionMap = readLocalAvatarSelectionMap();
  selectionMap[userId] = avatarSeq;
  writeLocalAvatarSelectionMap(selectionMap);
};

export const useAccountStore = defineStore('account', {
  state: () => ({
    a_token: cookies.get('UkmL') || '',
    r_token: cookies.get('RUkmL') || '',
    currentUser: {},
    authError: {
      login: 0,
    },
    isAdmin: false,
    correctPassword: 0,
    checkSign: {
      id: 0,
      nickName: 0,
    },
  }),
  getters: {
    isLoggedIn: state => !!state.a_token,
    authHeader: state => ({
      Authorization: `Bearer ${state.a_token}`,
      refreshToken: state.r_token
    }),
    getRole: state => state.currentUser.role,
  },
  actions: {
    getToken() {
      this.a_token = cookies.get('UkmL')
      this.r_token = cookies.get('RUkmL')
    },
    saveToken(a_token, r_token) {
      this.a_token = a_token
      this.r_token = r_token
      cookies.set('UkmL', a_token, '2h')
      cookies.set('RUkmL', r_token, '7d')
    },
    removeToken() {
      this.a_token = ''
      this.r_token = ''
      cookies.remove('UkmL')
      cookies.remove('RUkmL')
    },
    signup(credentials, birth) {
      const land = useLandStore()
      const day = birth.day.length === 1 ? `0${birth.day}` : birth.day
      const signupRequest = {
        ...credentials,
        birth: birth.year + birth.month + day,
      }
      axios({
        url: sr.members.signup(),
        method: 'post',
        data: signupRequest,
      })
        .then(res => {
          if (res.data) {
            alert('회원가입이 완료되었습니다. 새로운 환경에서 로그인 해주세요.')
            land.btnCh = 1
          } else {
            alert('회원가입에 실패했습니다. 잠시후 다시 시도해주세요.')
          }
        })
        .catch(err => {
          console.error(err.response.data)
          alert('회원가입에 실패했습니다. 잠시후 다시 시도해주세요.')
        })
    },
    async login(credentials) {
      await axios({
        url: sr.members.login(),
        method: 'post',
        data: { ...credentials },
        withCredentials: true,
      })
        .then(res => {
          this.authError.login = 0
          const access_token = res.headers.authorization.split(' ')[1]
          const refresh_token = res.headers.temp
          this.saveToken(access_token, refresh_token)
        })
        .catch(err => {
          console.error(err)
          this.authError.login = 1
        })
      if (!this.authError.login) {
        await this.fetchCurrentUser()
        if (this.currentUser.role === "ROLE_USER") {
          router.push({ name: 'main' })
        } else {
          router.push({ name: 'admin' })
        }
      }
    },
    logout() {
      const account = useAccountStore()
      const main = useMainStore()
      this.removeToken()
      account.$reset()
      main.$reset()
      router.push({ name: 'home' })
    },
    async fetchCurrentUser(options = {}) {
      const { forceTestAvatarOnMainEntry = false } = options

      if (this.isLoggedIn) {
        await axios({
          url: sr.members.member(),
          method: 'get',
          headers: this.authHeader,
        })
          .then(async res => {
            const fetchedUser = res.data || {}
            const forcedAvatarSeq = forceTestAvatarOnMainEntry
              ? getForcedAvatarSeqForUserId(fetchedUser?.id)
              : null
            const storedAvatarSeq = getStoredAvatarSeqForUserId(fetchedUser?.id)
            const currentAvatar = fetchedUser?.avatar || {}
            const nextAvatarSeq =
              forcedAvatarSeq ||
              storedAvatarSeq ||
              currentAvatar.seq ||
              null

            this.currentUser = {
              ...fetchedUser,
              avatar: nextAvatarSeq
                ? {
                    ...currentAvatar,
                    seq: nextAvatarSeq,
                  }
                : currentAvatar,
            }

            if (nextAvatarSeq) {
              persistAvatarSeqForUserId(fetchedUser?.id, nextAvatarSeq)
            }

            if (
              nextAvatarSeq &&
              currentAvatar.seq !== nextAvatarSeq &&
              (forcedAvatarSeq || storedAvatarSeq)
            ) {
              await this.changeAvatar({ avatarSeq: nextAvatarSeq })
            }
          })
          .catch(err => {
            if (err.response.status == 401) {
              this.removeToken()
              router.push({ name: 'home' })
            }
          })
      }
    },
    certificatePassword(password) {
      const main = useMainStore()
      this.fetchCurrentUser()
      axios({
        url: sr.members.validatePassword(),
        method: 'post',
        data: { password },
        headers: this.authHeader,
      })
        .then(res => {
          if (res.data) {
            main.btnCh = 3
            main.pBtnCh = 1
          } else {
            alert('비밀번호를 다시 확인해주세요')
          }
        })
        .catch(err => {
          console.error(err.response)
          alert('비밀번호가 일치하지 않습니다.')
        })
    },
    modifyCertificatePassword(password) {
      axios({
        url: sr.members.validatePassword(),
        method: 'post',
        data: { password },
        headers: this.authHeader,
      })
        .then(res => {
          if (res.data) {
            this.correctPassword = 1
          } else {
            this.correctPassword = 0
          }
        })
        .catch(err => {
          console.error(err.response)
          this.correctPassword = 0
        })
    },
    modifyInform(credentials) {
      const main = useMainStore()
      axios({
        url: sr.members.update(),
        method: 'put',
        data: { ...credentials },
        headers: this.authHeader,
      })
        .then(res => {
          if (res.data) {
            main.btnCh = 0
            main.pBtnCh = 0
            alert('성공적으로 정보가 변경되었습니다.')
          } else {
            alert('정보 변경이 실패했습니다.')
          }
        })
        .catch(err => {
          console.error(err.response)
        })
    },
    changePassword(password) {
      const land = useLandStore()
      const main = useMainStore()
      axios({
        url: sr.members.changePassword(),
        method: 'put',
        data: { changePassword: password.changePassword },
        headers: this.authHeader,
      })
        .then(res => {
          if (res.data) {
            land.btnCh = 1
            main.btnCh = 0
            alert('성공적으로 비밀번호가 변경되었습니다.')
          } else {
            alert('비밀번호 변경에 실패했습니다.')
          }
        })
        .catch(err => {
          console.error(err.response)
        })
    },
    duplicateId(id) {
      axios({
        url: sr.members.idDuplicate(),
        method: 'get',
        params: { id }
      })
        .then(res => {
          if (res.data) {
            this.checkSign.id = 1
          } else {
            this.checkSign.id = 0
          }
        })
        .catch(err => {
          console.error(err.response)
          this.checkSign.id = 0
        })
    },
    duplicateNickname(nickname) {
      axios({
        url: sr.members.nickNameDuplicate(),
        method: 'get',
        params: { nickname }
      })
        .then(res => {
          if (res.data) {
            this.checkSign.nickName = 1
          } else {
            this.checkSign.nickName = 0
            alert('중복된 닉네임이 있습니다.')
          }
        })
        .catch(err => {
          console.error(err.response)
          this.checkSign.nickName = 0
        })
    },
    deleteAccount() {
      const main = useMainStore()
      if (confirm('정말로 탈퇴하시겠습니까?')) {
        axios({
          url: sr.members.member(),
          method: 'delete',
          headers: this.authHeader,
        })
          .then(res => {
            if (res.data) {
              this.removeToken()
              this.isAdmin = false
              alert('회원탈퇴가 성공적으로 되었습니다.')
              main.$reset()
              router.push({ name: 'home' })
            } else {
              alert('회원탈퇴에 실패하셨습니다. 잠시후 다시 시도해주세요.')
            }
          })
          .catch(err => {
            console.error(err.response)
            alert('회원탈퇴에 실패하셨습니다.')
          })
      }
    },
    async changeAvatar(avatarId) {
      const requestedAvatarSeq = avatarId?.avatarSeq
      const resolvedAvatarSeq = requestedAvatarSeq

      if (!resolvedAvatarSeq) {
        return false
      }

      if (!this.currentUser.avatar) {
        this.currentUser.avatar = {}
      }

      this.currentUser.avatar.seq = resolvedAvatarSeq
      persistAvatarSeqForUserId(this.currentUser?.id, resolvedAvatarSeq)

      return await axios({
        url: sr.members.changeAvatar(),
        method: 'put',
        data: { avatarSeq: resolvedAvatarSeq },
        headers: this.authHeader,
      })
        .then(res => {
          if (res.data) {
            console.log('성공적으로 아바타가 변경되었습니다.')
            return true
          } else {
            console.log('아바타 변경에 실패했습니다.')
            return false
          }
        })
        .catch(err => {
          console.error(err.response)
          return false
        })
    },
  },
})
