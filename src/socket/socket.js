import { io } from "socket.io-client";

const socket = io("http://10.34.133.172:3001");

export default socket;