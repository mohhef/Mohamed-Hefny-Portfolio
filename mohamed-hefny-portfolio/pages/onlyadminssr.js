import BaseLayout from "@/components/layouts/BaseLayout"
import BasePage from "@/components/BasePage"
import {authorizeUser, withAuth} from '@/utils/auth0'


const OnlyAdminSSR  = ({ user, title}) => {
    return (
        <BaseLayout user={user} isLoading={false}>
            <BasePage>
                <h1>Hello {user && user.nickname}</h1>
                <h2>{title}</h2>
            </BasePage>
        </BaseLayout>
    )
}

const getTitle = () =>{
    return new Promise((res)=>{
        setTimeout(()=>{
            res({title:'my new title!'})
        }
        ,500)
    })
}

export const getServerSideProps = withAuth(async ({req, res}, user)=>{
    const title = await getTitle();
    return title
})('admin');

export default OnlyAdminSSR