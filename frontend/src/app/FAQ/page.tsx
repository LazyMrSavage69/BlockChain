"use client";
import Navbar from '@/app/navbar/page';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FAQPage() {
    const router = useRouter();

    const faqs = [
        {
            question: "What is Ethéré?",
            answer: "Ethéré is a decentralized platform that allows users to create, management, and sign secure legal contracts using blockchain technology. We combine AI assistance with the security of the Ethereum blockchain."
        },
        {
            question: "How does the Smart Contract system work?",
            answer: "You can choose from our templates or draft a new contract. Once agreed upon by both parties, the contract is hashed and recorded on the blockchain, creating an immutable proof of the agreement."
        },
        {
            question: "Is it legally binding?",
            answer: "Yes, digital agreements are legally binding in many jurisdictions. Our platform provides the cryptographic proof of consent and content integrity that can support legal validity."
        },
        {
            question: "Do I need cryptocurrency to use it?",
            answer: "While we use blockchain technology, we are working on abstracting the complexity. Some features involving direct blockchain transactions (like payments) may require a wallet, but we aim to make it accessible."
        },
        {
            question: "How is my data secured?",
            answer: "We use industry-standard encryption for data storage and transmission. Critical contract data is stored on decentralized storage with hashes on the blockchain to ensure it hasn't been tampered with."
        }
    ];

    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950 text-white">
            <Navbar user={null} />

            <div className="container mx-auto px-4 pt-32 pb-16">
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 mb-6">
                        Frequently Asked Questions
                    </h1>
                    <p className="text-xl text-purple-200 max-w-2xl mx-auto">
                        Everything you need to know about the product and billing.
                    </p>
                </div>

                <div className="max-w-3xl mx-auto space-y-4">
                    {faqs.map((faq, index) => (
                        <div key={index} className="bg-white/5 backdrop-blur-md border border-purple-500/20 rounded-xl overflow-hidden hover:bg-white/10 transition-colors">
                            <button
                                className="w-full px-6 py-4 text-left flex items-center justify-between focus:outline-none"
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                            >
                                <span className="text-lg font-semibold text-white">{faq.question}</span>
                                <svg
                                    className={`w-6 h-6 text-purple-400 transform transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            <div
                                className={`transition-all duration-300 ease-in-out text-purple-200 overflow-hidden ${openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                            >
                                <div className="px-6 pb-6">
                                    {faq.answer}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
