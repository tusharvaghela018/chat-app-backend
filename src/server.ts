import App from "@/app";
import AuthRoute from "@/Routes/auth.route";
import MessageRoute from "@/Routes/message.route";
import UserRoute from "@/Routes/user.route";

const appServer = new App([new AuthRoute(), new UserRoute(), new MessageRoute()]);

appServer.listen();

export default appServer;
