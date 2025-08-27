import { localDb } from './localDb.js';

export class CourseService {
    static async getAllCourses() {
        const courses = await localDb.getCourses();
        const users = await localDb.getUsers(); // Fetch all users to get mentor details

        // Map mentor details to courses
        return courses.map(course => {
            const mentor = users.find(user => user.id === course.mentor_id);
            return {
                ...course,
                mentor_name: mentor ? mentor.full_name : 'Unknown Mentor',
                mentor_avatar_url: mentor ? mentor.avatar_url : 'https://via.placeholder.com/32x32',
                mentor_bio: mentor ? mentor.bio : '',
                mentor_headline: mentor ? mentor.headline : ''
            };
        });
    }

    static async getCourseById(courseId) {
        const course = await localDb.getCourse(courseId);
        if (!course) return null;

        const mentor = await localDb.getUser(course.mentor_id);
        return {
            ...course,
            mentor_name: mentor ? mentor.full_name : 'Unknown Mentor',
            mentor_avatar_url: mentor ? mentor.avatar_url : 'https://via.placeholder.com/32x32',
            mentor_bio: mentor ? mentor.bio : '',
            mentor_headline: mentor ? mentor.headline : ''
        };
    }

    static async getMentorCourses(mentorId) {
        const courses = await localDb.getCourses();
        const mentorCourses = courses.filter(course => course.mentor_id === mentorId);
        const mentor = await localDb.getUser(mentorId);

        return mentorCourses.map(course => ({
            ...course,
            mentor_name: mentor ? mentor.full_name : 'Unknown Mentor',
            mentor_avatar_url: mentor ? mentor.avatar_url : 'https://via.placeholder.com/32x32'
        }));
    }

    static async getCourseReviews(courseId) {
        const reviews = await localDb.getAll('reviews');
        const users = await localDb.getUsers();
        return reviews.filter(review => review.course_id === courseId).map(review => {
            const student = users.find(user => user.id === review.student_id);
            return {
                ...review,
                student_name: student ? student.full_name : 'Anonymous',
                student_avatar_url: student ? student.avatar_url : 'https://via.placeholder.com/32x32'
            };
        });
    }

    static async getCourseSessions(courseId, userId) {
        const sessions = await localDb.getAll('sessions');
        const users = await localDb.getUsers();
        return sessions.filter(session =>
            session.course_id === courseId && (session.mentor_id === userId || session.student_id === userId)
        ).map(session => {
            const student = users.find(user => user.id === session.student_id);
            return {
                ...session,
                student_name: student ? student.full_name : 'Unknown Student',
                student_avatar_url: student ? student.avatar_url : 'https://via.placeholder.com/32x32'
            };
        });
    }

    static async getCourseMessages(courseId) {
        const messages = await localDb.getAll('messages');
        const users = await localDb.getUsers();
        return messages.filter(message => message.course_id === courseId).map(message => {
            const sender = users.find(user => user.id === message.sender_id);
            return {
                ...message,
                sender_name: sender ? sender.full_name : 'Unknown',
                sender_avatar_url: sender ? sender.avatar_url : 'https://via.placeholder.com/32x32'
            };
        }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    static async sendCourseMessage(courseId, senderId, messageText) {
        const newMessage = {
            id: `msg${Date.now()}`,
            course_id: courseId,
            sender_id: senderId,
            message_text: messageText,
            created_at: new Date().toISOString()
        };
        await localDb.add('messages', newMessage);
        return newMessage;
    }

    static async createCourse(courseData) {
        const newCourse = {
            id: `course${Date.now()}`,
            ...courseData,
            created_at: new Date().toISOString(),
            is_active: true // Default to active
        };
        await localDb.add('courses', newCourse);
        return newCourse;
    }

    static async updateCourse(courseId, updates) {
        return localDb.updateCourse(courseId, updates);
    }
}
