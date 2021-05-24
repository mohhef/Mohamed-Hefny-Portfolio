import BaseLayout from "@/components/layouts/BaseLayout"
import BasePage from "@/components/BasePage"

import withAuth from '@/hoc/withAuth'
import useSWR from "swr"

const Secret = ({user, isLoading}) => {
        return (
            <BaseLayout user={user} isLoading={isLoading}>
                <BasePage>
                    <h1>hello{user.name}</h1>
                </BasePage>
            </BaseLayout>
        )
}

//High Order Component - HOC
//simple function that takes a compoennt and returns a new component with some extended functionality

// function withAuth(Component){
//     return function(props){
//         return <Component title="Hello World" {...Props}/>
//     }
// }

// const withAuth = (Component) =>{
//     return props => {
//         return <Component title="Hello World" {...props}/>
//     }
// }

// const withAuth = Component => props =>
//     <Component title="Hello World" {...props} />

export default withAuth(Secret)()