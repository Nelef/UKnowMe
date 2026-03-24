import { BACKEND_BASE_URL } from '@/config/runtime'

const HOST = `${BACKEND_BASE_URL}/`

const MEMBERS = 'member/'
const MACHINGS = 'maching/'
const FEATURES = 'feature/'
const ROOMS = 'room/'
const AVATARS = 'avatar/'
const NOTICES = 'notice/'
const SESSIONS = 'session'


export default {
  members: {
    member: () => HOST + 'member',
    members: () => HOST + MEMBERS + 'list',
    memberDetail: memberSeq => HOST + MEMBERS + `${memberSeq}`,
    login: () => HOST + MEMBERS + 'login',
    // logout: () => HOST + MEMBERS + 'logout',
    signup: () => HOST + MEMBERS + 'join',
    changePassword: () => HOST + MEMBERS + 'password',
    update: () => HOST + MEMBERS + 'update',
    account: memberSeq => HOST + MEMBERS + `${memberSeq}`,
    idDuplicate: () => HOST + MEMBERS + 'check/id',
    nickNameDuplicate: () => HOST + MEMBERS + 'check/nickname',
    validatePassword: () => HOST + MEMBERS + 'validate/password',
    block: () => HOST + MEMBERS + 'block',
    report: () => HOST + MEMBERS + 'report',
    reportInfo: reportSeq => HOST + MEMBERS + 'report/' + `${reportSeq}`,
    changeAvatar: () => HOST + MEMBERS + 'avatar',
  },
  machings: {
    oneToOne: memberSeq => HOST + MACHINGS + '1vs1/' + `${memberSeq}`,
    twoToTwo: memberSeq => HOST + MACHINGS + '2vs2/' + `${memberSeq}`,
  },
  features: {
    balance: () => HOST + FEATURES + 'balance/create',
    balanceList: () => HOST + FEATURES + 'balance/list',
    balanceInfo: balanceSeq => HOST + FEATURES + 'balance/' + `${balanceSeq}`,
    keyword: () => HOST + FEATURES + 'keyword/create',
    keywordList: () => HOST + FEATURES + 'keyword/list',
    keywordInfo: keywordSeq => HOST + FEATURES + 'keyword/' + `${keywordSeq}`,
    keywordRand: () => HOST + FEATURES + 'keyword/random',
  },
  rooms: {
    like: memberSeq => HOST + ROOMS + 'like/' + `${memberSeq}`,
    exit: () => HOST + ROOMS + 'exit',
    entrance: () => HOST + ROOMS + 'entrance',
  },
  avatars: {
    avatar: () => HOST + 'avatar',
    avatarInfo: avatarSeq => HOST + AVATARS + `${avatarSeq}`,
  },
  notices: {
    // notice: () => HOST + 'notice',
    // noticeInfo: noticeSeq => HOST + NOTICES + `${noticeSeq}`,
    notices: () => HOST + NOTICES + 'list',
    notice: noticeSeq => HOST + NOTICES + `${noticeSeq}`,
    save: () => HOST + NOTICES + 'create',
  },
  sessions: {
    connect: () => HOST + SESSIONS,
    disconnect: () => HOST + SESSIONS,
    disconnectKeepalive: () => HOST + SESSIONS + '/disconnect',
  }
}
