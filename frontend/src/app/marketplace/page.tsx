"use client"
import React, { useState, useEffect, memo, useCallback } from 'react';
import { Search, X, Edit, Star, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Navbar from '../navbar/page';

interface User {
  id: number;
  email: string;
  name: string;
}

interface ContractTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  price: number;
  rating: number;
  downloads: number;
  creator: string;
  created_at: string;
}

interface ContractModalProps {
  template: ContractTemplate;
  onClose: () => void;
  onModify: (template: ContractTemplate) => void;
}

// Mock data - optimized as const
const mockTemplates: ContractTemplate[] = [
  {
    id: '1',
    title: 'Smart Property Lease',
    category: 'Real Estate',
    description: 'A comprehensive property lease agreement with automated payment scheduling and maintenance clauses.',
    price: 0,
    rating: 4.8,
    downloads: 1243,
    creator: 'John Doe',
    created_at: '2025-01-15'
  },
  {
    id: '2',
    title: 'Freelance Service Agreement',
    category: 'Employment',
    description: 'Professional service contract template for freelancers and contractors with milestone-based payments.',
    price: 0,
    rating: 4.9,
    downloads: 2156,
    creator: 'Jane Smith',
    created_at: '2025-02-20'
  },
  {
    id: '3',
    title: 'NFT Sales Contract',
    category: 'Digital Assets',
    description: 'Secure NFT transfer agreement with royalty provisions and intellectual property rights.',
    price: 0,
    rating: 4.7,
    downloads: 987,
    creator: 'Mike Johnson',
    created_at: '2025-03-10'
  },
  {
    id: '4',
    title: 'Partnership Agreement',
    category: 'Business',
    description: 'Multi-party business partnership contract with profit sharing and governance rules.',
    price: 0,
    rating: 4.6,
    downloads: 756,
    creator: 'Sarah Williams',
    created_at: '2025-01-28'
  },
  {
    id: '5',
    title: 'Supply Chain Contract',
    category: 'Logistics',
    description: 'End-to-end supply chain agreement with delivery milestones and quality assurance.',
    price: 0,
    rating: 4.5,
    downloads: 634,
    creator: 'David Brown',
    created_at: '2025-02-05'
  },
  {
    id: '6',
    title: 'Confidentiality Agreement',
    category: 'Legal',
    description: 'Non-disclosure agreement for protecting sensitive business information and trade secrets.',
    price: 0,
    rating: 4.9,
    downloads: 1876,
    creator: 'Emily Davis',
    created_at: '2025-03-15'
  }
];

// Memoized Modal Component
const ContractModal = memo<ContractModalProps>(({ template, onClose, onModify }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
          >
            <X size={24} />
          </button>
          <h2 className="text-3xl font-bold text-white mb-2">{template.title}</h2>
          <div className="flex items-center gap-4 text-white text-sm">
            <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
              {template.category}
            </span>
            <div className="flex items-center gap-1">
              <Star size={16} fill="currentColor" />
              <span>{template.rating}</span>
            </div>
            <div className="flex items-center gap-1">
              <Download size={16} />
              <span>{template.downloads.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-100 mb-2">Description</h3>
              <p className="text-gray-300 leading-relaxed">{template.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <p className="text-gray-400 text-sm mb-1">Creator</p>
                <p className="text-white font-medium">{template.creator}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <p className="text-gray-400 text-sm mb-1">Created</p>
                <p className="text-white font-medium">
                  {new Date(template.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-100 mb-3">Contract Features</h3>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>Blockchain-verified timestamps and signatures</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>Immutable version history tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>Multi-party signature support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>Customizable clauses and terms</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>Automated compliance checks</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border-t border-gray-700 p-6 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
          >
            Go Back
          </button>
          <button
            onClick={() => onModify(template)}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <Edit size={20} />
            Modify Contract
          </button>
        </div>
      </div>
    </div>
  );
});

ContractModal.displayName = 'ContractModal';

// Memoized Card Component
const TemplateCard = memo<{ template: ContractTemplate; onClick: () => void }>(
  ({ template, onClick }) => (
    <div
      onClick={onClick}
      className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden border border-gray-800 hover:border-orange-500 transition-all cursor-pointer group"
    >
      <div className="h-64 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
        <div className="text-center z-10">
          <h3 className="text-2xl font-bold text-white mb-4">{template.title}</h3>
          <div className="flex items-center justify-center gap-4 text-white text-sm">
            <div className="flex items-center gap-1">
              <Star size={16} fill="currentColor" />
              <span>{template.rating}</span>
            </div>
            <div className="flex items-center gap-1">
              <Download size={16} />
              <span>{template.downloads}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-black">
        <h3 className="font-semibold text-white mb-1">{template.title}</h3>
        <p className="text-gray-500 text-sm">{template.category}</p>
      </div>
    </div>
  )
);

TemplateCard.displayName = 'TemplateCard';

const Marketplace: React.FC = () => {
  const router = useRouter();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser();
  }, []);

      useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contracts`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
        const data: ContractTemplate[] = await response.json();
        setTemplates(data);
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);


  const fetchUser = async () => {
    try {
      const response = await fetch('/api/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        router.push('/login');
      }
    } catch (err) {
      console.error('Auth error:', err);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleModify = useCallback((template: ContractTemplate) => {
    console.log('Navigate to modify page for template:', template.id);
    alert(`Navigating to modify page for: ${template.title}`);
  }, []);

  const handleCardClick = useCallback((template: ContractTemplate) => {
    setSelectedTemplate(template);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedTemplate(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950">
      <Navbar user={user} onLogout={handleLogout} />
      
      <div className="pt-20 px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold mb-4 text-white">Marketplace</h1>
            <p className="text-gray-400 text-lg mb-8">
              The best templates, plugins and<br />components from the community.
            </p>
            
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-full py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all"
              />
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white">All Templates</h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onClick={() => handleCardClick(template)}
                />
              ))}
            </div>
          )}

          {filteredTemplates.length === 0 && !loading && (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg">No templates found matching your search.</p>
            </div>
          )}
        </div>

        {selectedTemplate && (
          <ContractModal
            template={selectedTemplate}
            onClose={handleCloseModal}
            onModify={handleModify}
          />
        )}
      </div>
    </div>
  );
};

export default Marketplace;