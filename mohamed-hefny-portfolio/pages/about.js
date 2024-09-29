import BaseLayout from "@/components/layouts/BaseLayout"
import BasePage from "@/components/BasePage"
import { useUser } from '@auth0/nextjs-auth0';
import { Row, Col } from 'reactstrap'
import { useEffect } from 'react'
const About = () => {

    useEffect(() => {

        //this is called when going away from the componenet, dispose
        return () => {
            window.__isAboutLoaded = true;
        }
    }, [])

    const createFadeInClass = () => {
        if (typeof window != 'undefined') {
            return window.__isAboutLoaded ? '' : 'fadein'
        }
        return 'fadein';
    }
    const { user, error, isLoading } = useUser();
    return (
        <BaseLayout user={user} isLoading={isLoading}>
            <BasePage title = "About Me - Mohamed Hefny"className="about-page">
                <h1 className={`title ${createFadeInClass()}`}>Welcome To My Site!</h1>
                <Row className="mt-5">
                    <Col md="6">
                        <div className="left-side">
                            <img className={`image ${createFadeInClass()}`} src="/images/self.jpg" />
                        </div>
                    </Col>
                    <Col md="6">
                        <div className={`right-side ${createFadeInClass()}`}>
                            <p>My name is Mohamed Hefny, and I am an enthusiastic software engineer with a strong foundation in various technologies. I hold a bachelor's degree in software engineering and have gained extensive experience through internships and professional roles.</p>
                            <p>Currently, I work as a Software Developer II at Amazon Web Services, where I focus on enhancing the CloudFormation service and improving customer experiences.
                                Previously, I worked at Morgan Stanley, where I developed APIs and collaborated with cross-functional teams to create solutions for financial clients.
                            </p> 
                             <p>In addition to my technical skills in Java, Kotlin, Python, and various AWS services,
                                 I am passionate about staying up to date with the latest technologies in software development. 
                                 I am also a large language model (LLM) enthusiast and have completed the Machine Learning Specialization offered by Stanford on Coursera.
                            </p>
                        </div>
                    </Col>
                </Row>
            </BasePage>
        </BaseLayout>
    )
}
export default About;
