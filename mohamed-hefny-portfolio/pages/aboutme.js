import BaseLayout from "@/components/layouts/BaseLayout"
import BasePage from "@/components/BasePage"
import { useUser } from '@auth0/nextjs-auth0';
import { Row, Col } from 'reactstrap'
import { useEffect } from 'react'
const AboutMe = () => {
    const { user, error, isLoading } = useUser();

    return (
        <BaseLayout user={user} isLoading={isLoading}>
            <BasePage canonicalPath = "/about" title = "About Me - Mohamed Hefny"className="about-page">
                <h1 className={`title`}>Welcome To My Site!</h1>
                <Row className="mt-5">
                    <Col md="6">
                        <div className="left-side">
                            <img className={`image`} src="/images/self.jpg" />
                        </div>
                    </Col>
                    <Col md="6">
                        <div className={`right-side`}>
                            <p>My name is Mohamed Hefny and I am an enthusiastic software engineer. </p>
                            <p>
                                I have a bachelor's degree in software engineering and several internships of experience working
                                on a wide range of technologies and projects from Java(Spring) development for a streaming app to
                                modern mobile and web applications in React, building AI projects using python and even building a board game in C++!
              </p>
                            <p>
                                Throughout my career, I have acquired advanced technical knowledge and the ability to explain
                                programming topics clearly and in detail to a broad audience. I have a keen interest in being
                                up to date with the latest technologies used to improve a developer's experience.
              </p>
                        </div>
                    </Col>
                </Row>
            </BasePage>
        </BaseLayout>
    )
}
export default AboutMe;
