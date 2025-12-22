"use client"
import React, { useState, useEffect, memo, useCallback } from 'react';
import { Search, X, Edit, Star, Download, ShoppingCart } from 'lucide-react';
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
  isOwned?: boolean;
}

interface ContractModalProps {
  template: ContractTemplate;
  onClose: () => void;
  onModify: (template: ContractTemplate) => void;
}

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
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <p className="text-gray-400 text-sm mb-1">Price</p>
                <p className="text-white font-medium text-lg">
                  {template.price > 0 ? `$${template.price.toFixed(2)}` : 'Gratuit'}
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <p className="text-gray-400 text-sm mb-1">Category</p>
                <p className="text-white font-medium">{template.category}</p>
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
          {template.price > 0 ? (
            <button
              onClick={() => onModify(template)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <ShoppingCart size={20} />
              Acheter ${template.price.toFixed(2)}
            </button>
          ) : (
            <button
              onClick={() => onModify(template)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Edit size={20} />
              Utiliser gratuitement
            </button>
          )}
          {template.isOwned && (
            <div className="absolute top-0 right-0 p-4">
              <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg transform rotate-12">
                Acheté
              </span>
            </div>
          )}
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
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-white">{template.title}</h3>
          {template.price > 0 ? (
            <span className="text-orange-500 font-bold">${template.price.toFixed(2)}</span>
          ) : (
            <span className="text-green-500 font-bold">Gratuit</span>
          )}
          {template.isOwned && (
            <span className="ml-2 bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs border border-green-500/30">
              Acheté
            </span>
          )}
        </div>
        <p className="text-gray-500 text-sm">{template.category}</p>
      </div>
    </div>
  )
);

TemplateCard.displayName = 'TemplateCard';

// Publish Template Modal
const PublishTemplateModal = memo<{ onClose: () => void; onSuccess: () => void; user: User }>(({ onClose, onSuccess, user }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    category: 'General',
    content: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Split content into basic clauses approximately by newlines for now
      // Ideally we'd use parsing logic or the AI wrapper, but user asked for simple upload/blueprint
      const clauses = formData.content.split('\n\n').filter(Boolean).map((text, i) => ({
        title: `Clause ${i + 1}`,
        body: text.trim()
      }));

      const payload = {
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
        category: formData.category,
        example: {
          clauses: clauses,
          raw_text: formData.content
        },
        schema: {
          clauses: clauses
        },
        creatorId: user.id
      };

      const res = await fetch('/api/contracts/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Failed to create template');
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Erreur lors de la création du template');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl border border-gray-700 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Vendre un Template</h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && <div className="p-3 bg-red-900/50 text-red-200 rounded-lg">{error}</div>}

          <div>
            <label className="block text-gray-300 mb-1">Titre</label>
            <input
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Contrat de Freelance"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-1">Prix ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-1">Catégorie</label>
              <input
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Business, Legal..."
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 mb-1">Description</label>
            <textarea
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 min-h-[80px]"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez ce que couvre ce contrat..."
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-1">Contenu du Contrat (Blueprint)</label>
            <p className="text-sm text-gray-400 mb-2">Copiez-collez le texte de votre contrat ici. Séparez les clauses par des sauts de ligne doubles.</p>
            <textarea
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 min-h-[200px] font-mono text-sm"
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              placeholder="ARTICLE 1: DEFINITIONS..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 font-semibold disabled:opacity-50"
            >
              {isSubmitting ? 'Publication...' : 'Publier le Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
PublishTemplateModal.displayName = 'PublishTemplateModal';

const Marketplace: React.FC = () => {
  const router = useRouter();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userPlan, setUserPlan] = useState<string>('free'); // Default to free
  const [showPublishModal, setShowPublishModal] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      // Pass userId if logged in to check ownership
      const url = user?.id
        ? `/api/contracts/templates?userId=${user.id}`
        : '/api/contracts/templates';

      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ContractTemplate[] = await response.json();
      console.log('[Marketplace] Fetched templates:', data.length, data);
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);


  const fetchUser = async () => {
    try {
      const response = await fetch('/api/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);

        // Fetch subscription plan
        if (userData.email) {
          try {
            const subResponse = await fetch('/api/subscriptions/usage/check', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ userEmail: userData.email })
            });
            if (subResponse.ok) {
              const subData = await subResponse.json();
              if (subData.success && subData.data?.planId) {
                console.log('[Marketplace] User plan:', subData.data.planId);
                setUserPlan(subData.data.planId);
              }
            }
          } catch (e) {
            console.error('Failed to fetch plan:', e);
          }
        }
      } else {
        // router.push('/login'); // Allow viewing without login?
      }
    } catch (err) {
      console.error('Auth error:', err);
      // router.push('/login');
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

  const handleModify = useCallback(async (template: ContractTemplate) => {
    if (!user) {
      router.push('/login');
      return;
    }

    // If template is free, create contract directly
    if (template.price === 0) {
      // Direct creation
      try {
        const response = await fetch(`/api/contracts/templates/${template.id}/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userEmail: user.email,
            userId: user.id,
            successUrl: `${window.location.origin}/contractspage`, // Redirect to my contracts
            cancelUrl: `${window.location.origin}/marketplace`,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // If direct success (mock or free)
          if (data.success && data.data?.checkoutUrl && !data.data.checkoutUrl.includes('stripe')) {
            // It's a redirect to successUrl usually, but here we might just go to dashboard
            router.push('/contractspage');
          } else if (data.data?.checkoutUrl) {
            window.location.href = data.data.checkoutUrl;
          }
        } else {
          alert('Erreur lors de la création');
        }
      } catch (e) { console.error(e); }
      return;
    }

    // If template is paid, create Stripe checkout
    try {
      const successUrl = `${window.location.origin}/contractspage?purchase=success`;
      const cancelUrl = `${window.location.origin}/marketplace`;

      const response = await fetch(`/api/contracts/templates/${template.id}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userEmail: user.email,
          userId: user.id,
          successUrl,
          cancelUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Erreur: ${error.error || 'Impossible de créer le checkout'}`);
        return;
      }

      const data = await response.json();
      if (data.success && data.data?.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.data.checkoutUrl;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Erreur lors de la création du checkout');
    }
  }, [user, router]);

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
          <div className="text-center mb-12 relative">
            <h1 className="text-6xl font-bold mb-4 text-white">Marketplace</h1>
            <p className="text-gray-400 text-lg mb-8">
              The best templates, plugins and<br />components from the community.
            </p>

            {/* Publish Button - CREATOR ONLY */}
            {user && userPlan === 'creator' && (
              <div className="absolute top-0 right-0">
                <button
                  onClick={() => setShowPublishModal(true)}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-full font-bold shadow-lg transition-all flex items-center gap-2 animate-bounce"
                >
                  <Star size={18} className="text-yellow-300" />
                  Vendre un Template
                </button>
              </div>
            )}

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

        {showPublishModal && user && (
          <PublishTemplateModal
            user={user}
            onClose={() => setShowPublishModal(false)}
            onSuccess={() => {
              fetchTemplates();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Marketplace;