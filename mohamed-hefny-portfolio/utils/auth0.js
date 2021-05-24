
import {getSession} from '@auth0/nextjs-auth0'

export const isAuthorized = (user,role) =>{
    return user['https://mohamed-hefny' + '/roles'].includes(role);
}

export const withAuth = (getData) =>{
    return async({req,res})=>{
        const session = await getSession(req, res);
        if (!session || !session.user) {
            res.writeHead(302, {
                Location: 'api/auth/login'
            });
            res.end();
            return {props: {}};
        }
        const data = getData? await getData({req,res},session.user) : {}
        return {props:{user:session.user, ...data}};
    }
}

//export const withAuth=()=>({req,res})=>{}

export const authorizeUser = async (req, res) => {
    const session = await getSession(req, res);
    if (!session || !session.user) {
        res.writeHead(302, {
            Location: 'api/auth/login'
        });
        res.end();
        return null
    }
    return session.user;
}
