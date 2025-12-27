"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Plus, Trash2, Edit2, GripVertical, ChevronUp, ChevronDown, Image as ImageIcon, Copy } from "lucide-react";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

interface PageProps {
  params: Promise<{ id: string }>;
}

type QuestionType = 'multiple_choice' | 'true_false' | 'essay';

interface Question {
  id?: number;
  questionText: string;
  questionType: QuestionType;
  imageUrl?: string;
  options: string[];
  correctAnswer: string[];
  points: number;
  order: number;
  isRequired: boolean;
}

export default function QuizDetailPage({ params }: PageProps) {
  const router = useRouter();

  const [quizId, setQuizId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dialogType, setDialogType] = useState<'success' | 'error'>('success');
  const [dialogMessage, setDialogMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'questions' | 'scoring'>('general');

  // Options for dropdowns
  const [locationOptions, setLocationOptions] = useState<Array<{ value: string, label: string }>>([]);
  const [serviceOptions, setServiceOptions] = useState<Array<{ value: string, label: string }>>([]);

  const isCreateMode = quizId === "new";

  // Form state - General Info
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    locationKey: '',
    serviceKey: '',
    passingScore: 60,
    questionsPerPage: 1,
    durationMinutes: 30,
    isPublished: false,
  });

  // Questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [questionError, setQuestionError] = useState<string>('');

  // Scoring templates state - Simple mapping of correct answers to scores
  const [scoringMap, setScoringMap] = useState<Array<{ correctAnswer: number, score: number }>>([]);
  const [showScoringDialog, setShowScoringDialog] = useState(false);
  const [editingScoring, setEditingScoring] = useState<{ correctAnswer: number, score: number } | null>(null);
  const [scoringType, setScoringType] = useState<'linear' | 'iq-conversion'>('iq-conversion');

  // Quiz token/link state
  const [quizToken, setQuizToken] = useState<string>('');

  // Metadata state
  const [metadata, setMetadata] = useState<{
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    updatedBy?: string;
  }>({});

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Copy template state
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyFormData, setCopyFormData] = useState({
    title: '',
    locationKey: '',
    serviceKey: ''
  });

  // Warn user about unsaved changes
  useUnsavedChanges(hasUnsavedChanges);

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setQuizId(resolvedParams.id);
    };
    getParams();
  }, [params]);

  // Warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!quizId) return;

    const loadData = async () => {
      if (!isCreateMode) {
        await loadQuizData();
      } else {
        await loadOptions();
      }
    };

    loadData();
  }, [quizId, isCreateMode]);

  const loadOptions = async () => {
    try {
      setLoading(true);

      const [locationRes, serviceRes] = await Promise.all([
        API.config.getConfigsByGroup('location'),
        API.config.getConfigsByGroup('service')
      ]);

      if (locationRes?.success) {
        const locationData = locationRes.data || [];
        const locationOpts = Array.isArray(locationData) ? locationData.map((config: { key: string, value: string }) => ({
          value: config.key,
          label: config.value
        })) : [];
        setLocationOptions(locationOpts);
      }

      if (serviceRes?.success) {
        const serviceData = serviceRes.data || [];
        const serviceOpts = Array.isArray(serviceData) ? serviceData.map((config: { key: string, value: string }) => ({
          value: config.key,
          label: config.value
        })) : [];
        setServiceOptions(serviceOpts);
      }

    } catch (err: any) {
      console.error('❌ Failed to load options:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack
      });
    } finally {
      setLoading(false);
    }
  };

  const loadQuizData = async () => {
    try {
      setLoading(true);

      const [quizRes, locationRes, serviceRes] = await Promise.all([
        API.quizzes.getQuiz(Number(quizId)),
        API.config.getConfigsByGroup('location'),
        API.config.getConfigsByGroup('service')
      ]);

      console.log('📨 API Responses received:');
      console.log('Quiz response:', quizRes);
      console.log('Location response:', locationRes);
      console.log('Service response:', serviceRes);

      if (locationRes?.success) {
        const locationData = locationRes.data || [];
        const locationOpts = Array.isArray(locationData) ? locationData.map((config: { key: string, value: string }) => ({
          value: config.key,
          label: config.value
        })) : [];
        setLocationOptions(locationOpts);
      }

      if (serviceRes?.success) {
        const serviceData = serviceRes.data || [];
        const serviceOpts = Array.isArray(serviceData) ? serviceData.map((config: { key: string, value: string }) => ({
          value: config.key,
          label: config.value
        })) : [];
        setServiceOptions(serviceOpts);
      }

      if (quizRes.success && quizRes.data) {
        const quizData = quizRes.data;

        setFormData({
          title: quizData.title || '',
          description: quizData.description || '',
          locationKey: quizData.locationKey || '',
          serviceKey: quizData.serviceKey || '',
          passingScore: quizData.passingScore || 60,
          questionsPerPage: quizData.questionsPerPage || 1,
          durationMinutes: quizData.durationMinutes || 30,
          isPublished: quizData.isPublished === true, // Explicitly check for true
        });

        // Set quiz token for link generation
        // Use shortUrl if available, otherwise use normalUrl or token
        setQuizToken(quizData.shortUrl || quizData.normalUrl || quizData.token || quizData.id?.toString() || '');

        // Set metadata
        setMetadata({
          createdAt: quizData.createdAt,
          updatedAt: quizData.updatedAt,
          createdBy: quizData.createdBy,
          updatedBy: quizData.updatedBy
        });

        // Transform questions to local format
        const transformedQuestions: Question[] = (quizData.questions || []).map((q: any, index: number) => {
          // Convert questionType from backend format (multiple-choice) to frontend format (multiple_choice)
          const frontendQuestionType = q.questionType ? q.questionType.replace(/-/g, '_') : 'multiple_choice';

          // For multiple choice, convert option values to indices
          let correctAnswerArray = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer].filter(Boolean);

          if (frontendQuestionType === 'multiple_choice' && q.options && correctAnswerArray.length > 0) {
            correctAnswerArray = correctAnswerArray.map((answer: string) => {
              const optionIndex = q.options.indexOf(answer);
              return optionIndex >= 0 ? optionIndex.toString() : answer;
            });
          }

          return {
            id: q.id,
            questionText: q.questionText || '',
            questionType: frontendQuestionType as QuestionType,
            imageUrl: q.imageUrl || '',
            options: q.options || [],
            correctAnswer: correctAnswerArray,
            points: q.points || 1,
            order: q.order !== undefined ? q.order : index,
            isRequired: q.isRequired !== undefined ? q.isRequired : true,
          };
        });

        setQuestions(transformedQuestions);

        // Load scoring map - convert from new backend format
        const scoringData = quizData.scoringTemplates || [];
        const scoreMap = scoringData.map((s: any) => ({
          correctAnswer: s.correctAnswers || 0,
          score: (s.correctAnswers || 0) * (s.points || 1)  // Calculate actual score: correctAnswers × points
        }));
        setScoringMap(scoreMap);
      }

    } catch (err: any) {
      console.error('❌ Failed to load quiz data:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        quizId: quizId
      });
      setDialogType('error');
      setDialogMessage(err?.message || 'Failed to load quiz data');
      setShowDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate required fields
      if (!formData.title.trim()) {
        setDialogType('error');
        setDialogMessage('Title is required');
        setShowDialog(true);
        return;
      }

      // Validate scoring templates match question count
      if (questions.length > 0 && scoringMap.length > 0) {
        const totalQuestions = questions.length;
        const maxCorrectAnswer = Math.max(...scoringMap.map(s => s.correctAnswer));
        const minCorrectAnswer = Math.min(...scoringMap.map(s => s.correctAnswer));

        // Check if scoring covers 0 to totalQuestions
        if (minCorrectAnswer !== 0) {
          setDialogType('error');
          setDialogMessage(`❌ Template scoring tidak lengkap!\n\nHarus ada template untuk 0 jawaban benar (saat ini dimulai dari ${minCorrectAnswer}).\n\nSilakan generate ulang scoring template atau tambahkan manual.`);
          setShowDialog(true);
          return;
        }

        if (maxCorrectAnswer !== totalQuestions) {
          setDialogType('error');
          setDialogMessage(`❌ Template scoring tidak sesuai jumlah soal!\n\nQuiz memiliki ${totalQuestions} soal, tapi scoring template maksimal untuk ${maxCorrectAnswer} jawaban benar.\n\nSilakan generate ulang scoring template yang sesuai.`);
          setShowDialog(true);
          return;
        }

        // Check if all numbers from 0 to totalQuestions are covered
        const missingNumbers: number[] = [];
        for (let i = 0; i <= totalQuestions; i++) {
          if (!scoringMap.find(s => s.correctAnswer === i)) {
            missingNumbers.push(i);
          }
        }

        if (missingNumbers.length > 0) {
          const missingStr = missingNumbers.length > 5
            ? `${missingNumbers.slice(0, 5).join(', ')}... (${missingNumbers.length} lainnya)`
            : missingNumbers.join(', ');

          setDialogType('error');
          setDialogMessage(`❌ Template scoring tidak lengkap!\n\nQuiz memiliki ${totalQuestions} soal. Belum ada template untuk: ${missingStr} jawaban benar.\n\nHarus ada template untuk 0 sampai ${totalQuestions} jawaban benar.\n\nSilakan generate ulang scoring template.`);
          setShowDialog(true);
          return;
        }
      }

      // Warn if no scoring templates
      if (questions.length > 0 && scoringMap.length === 0) {
        const confirmed = window.confirm(
          '⚠️ Belum ada template scoring!\n\nQuiz ini belum memiliki template penilaian. Quiz tidak akan bisa di-publish tanpa scoring template.\n\nLanjutkan menyimpan tanpa scoring template?'
        );
        if (!confirmed) {
          return;
        }
      }

      const quizData: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        locationKey: formData.locationKey || undefined,
        serviceKey: formData.serviceKey || undefined,
        passingScore: formData.passingScore,
        questionsPerPage: formData.questionsPerPage,
        durationMinutes: formData.durationMinutes,
      };

      // Add scoring map as templates if any (New API format)
      if (scoringMap.length > 0) {
        quizData.scoringTemplates = scoringMap.map(s => {
          // Calculate points: if score is 0 and correctAnswer is 0, points = 1 (to avoid division by zero)
          // Otherwise: points = score / correctAnswer
          let points = 1;
          if (s.correctAnswer > 0 && s.score > 0) {
            points = Math.round(s.score / s.correctAnswer);
          } else if (s.correctAnswer === 0) {
            points = 1; // Default for 0 correct answers
          }

          return {
            correctAnswers: s.correctAnswer,
            points: points
          };
        });
      }

      // Add questions to quiz data
      if (questions.length > 0) {
        quizData.questions = questions.map((q, index) => {
          // Convert questionType format: multiple_choice -> multiple-choice
          let apiQuestionType = q.questionType.replace(/_/g, '-');

          // Filter out empty options before sending to backend
          const filteredOptions = (q.options || []).filter(option =>
            option && typeof option === 'string' && option.trim() !== ''
          );

          // Build question object
          const questionData: any = {
            questionText: q.questionText,
            questionType: apiQuestionType,
            options: filteredOptions,
            order: index,
          };

          // Add correctAnswer based on question type
          if (q.questionType === 'essay') {
            // For essay questions, always set empty string
            questionData.correctAnswer = '';
          } else if (q.questionType === 'multiple_choice') {
            // For multiple choice, convert indices back to actual option values
            if (Array.isArray(q.correctAnswer)) {
              const validAnswers = q.correctAnswer
                .map(a => {
                  // Check if it's an index (numeric string)
                  const index = parseInt(a);
                  if (!isNaN(index) && index >= 0 && index < filteredOptions.length) {
                    return filteredOptions[index];
                  }
                  // Otherwise use the value directly (for backward compatibility)
                  return a;
                })
                .filter(a => a && a.trim() !== '');

              if (validAnswers.length > 0) {
                questionData.correctAnswer = validAnswers[0];
              } else {
                questionData.correctAnswer = '';
              }
            } else {
              questionData.correctAnswer = '';
            }
          } else {
            // For other question types (true_false), correctAnswer is required
            if (Array.isArray(q.correctAnswer)) {
              const validAnswers = q.correctAnswer.filter(a => a && a.trim() !== '');
              if (validAnswers.length > 0) {
                questionData.correctAnswer = validAnswers[0];
              } else {
                questionData.correctAnswer = '';
              }
            } else if (typeof q.correctAnswer === 'string' && (q.correctAnswer as string).trim() !== '') {
              questionData.correctAnswer = q.correctAnswer as string;
            } else {
              questionData.correctAnswer = '';
            }
          }

          return questionData;
        });
      }

      console.log('=== SENDING TO BACKEND ===');
      console.log('Quiz data:', JSON.stringify(quizData, null, 2));
      console.log('Questions:', quizData.questions);
      console.log('========================');

      let result;
      if (isCreateMode) {
        result = await API.quizzes.createQuiz(quizData);
      } else {
        result = await API.quizzes.updateQuiz(Number(quizId), quizData);
      }

      if (result.success) {
        const successMessage = isCreateMode
          ? 'Quiz created successfully!'
          : 'Quiz updated successfully!';

        // Reset unsaved changes flag
        setHasUnsavedChanges(false);

        setDialogType('success');
        setDialogMessage(successMessage);
        setShowDialog(true);
      } else {
        setDialogType('error');
        setDialogMessage(result.message || 'Failed to save quiz');
        setShowDialog(true);
      }
    } catch (err: any) {
      console.error('Failed to save quiz:', err);
      setDialogType('error');
      setDialogMessage(err?.message || 'Failed to save quiz');
      setShowDialog(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDialogClose = () => {
    setShowDialog(false);
    if (dialogType === 'success') {
      if (isCreateMode) {
        router.push('/admin/quizzes');
      }
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const result = await API.quizzes.deleteQuiz(Number(quizId));

      if (result.success) {
        setShowDeleteConfirm(false);
        setDialogType('success');
        setDialogMessage('Quiz berhasil dihapus!');
        setShowDialog(true);

        // Redirect after showing success
        setTimeout(() => {
          router.push('/admin/quizzes');
        }, 1500);
      } else {
        setShowDeleteConfirm(false);
        setDialogType('error');
        setDialogMessage(result.message || 'Gagal menghapus quiz');
        setShowDialog(true);
      }
    } catch (err: any) {
      console.error('Failed to delete quiz:', err);
      setShowDeleteConfirm(false);
      setDialogType('error');
      setDialogMessage(err?.message || 'Gagal menghapus quiz');
      setShowDialog(true);
    } finally {
      setDeleting(false);
    }
  };

  // Copy as Template Handler
  const handleCopyAsTemplate = () => {
    // Pre-fill with modified title
    setCopyFormData({
      title: formData.title + ' (Copy)',
      locationKey: formData.locationKey,
      serviceKey: formData.serviceKey
    });
    setShowCopyDialog(true);
  };

  const handleSubmitCopy = async () => {
    try {
      setCopying(true);

      // Validate
      if (!copyFormData.title.trim()) {
        setDialogType('error');
        setDialogMessage('Nama quiz harus diisi');
        setShowDialog(true);
        return;
      }

      // Prepare quiz data with new values
      const quizData: any = {
        title: copyFormData.title.trim(),
        description: formData.description,
        locationKey: copyFormData.locationKey || undefined,
        serviceKey: copyFormData.serviceKey || undefined,
        passingScore: formData.passingScore,
        questionsPerPage: formData.questionsPerPage,
        durationMinutes: formData.durationMinutes,
      };

      // Copy questions
      if (questions.length > 0) {
        quizData.questions = questions.map((q, index) => {
          let apiQuestionType = q.questionType.replace(/_/g, '-');

          // Build question object
          const questionData: any = {
            questionText: q.questionText,
            questionType: apiQuestionType,
            options: q.options || [],
            order: index,
          };

          // Add correctAnswer based on question type
          if (q.questionType === 'essay') {
            // For essay questions, always set empty string
            questionData.correctAnswer = '';
          } else if (q.questionType === 'multiple_choice') {
            // For multiple choice, convert indices back to actual option values
            const answerValue: any = q.correctAnswer;
            const options = questionData.options || [];

            if (Array.isArray(answerValue)) {
              const validAnswers = answerValue
                .map((a: any) => {
                  // Check if it's an index (numeric string)
                  const idx = parseInt(a);
                  if (!isNaN(idx) && idx >= 0 && idx < options.length) {
                    return options[idx];
                  }
                  // Otherwise use the value directly
                  return a;
                })
                .filter((a: any) => a && a.trim() !== '');

              if (validAnswers.length > 0) {
                questionData.correctAnswer = validAnswers[0];
              } else {
                questionData.correctAnswer = '';
              }
            } else {
              questionData.correctAnswer = '';
            }
          } else {
            // For other question types (true_false), correctAnswer is required
            const answerValue: any = q.correctAnswer;
            if (Array.isArray(answerValue)) {
              const validAnswers = answerValue.filter((a: any) => a && a.trim() !== '');
              if (validAnswers.length > 0) {
                questionData.correctAnswer = validAnswers[0];
              } else {
                questionData.correctAnswer = '';
              }
            } else if (answerValue && typeof answerValue === 'string' && answerValue.trim() !== '') {
              questionData.correctAnswer = answerValue.trim();
            } else {
              questionData.correctAnswer = '';
            }
          }

          return questionData;
        });
      }

      // Copy scoring map (New API format)
      // Important: Only copy scoring if it matches the number of questions
      const totalQuestions = quizData.questions?.length || 0;
      if (scoringMap.length > 0 && totalQuestions > 0) {
        // Check if scoring map is complete for the number of questions
        const maxCorrectAnswer = Math.max(...scoringMap.map(s => s.correctAnswer));

        if (maxCorrectAnswer >= totalQuestions) {
          // Scoring map is complete, copy it with actual score values
          quizData.scoringTemplates = scoringMap
            .filter(s => s.correctAnswer <= totalQuestions) // Only copy templates up to total questions
            .map(s => {
              // Calculate points from score (score = correctAnswers × points)
              // If correctAnswer is 0, set points to score value directly
              const points = s.correctAnswer > 0 ? Math.round(s.score / s.correctAnswer) : s.score;

              return {
                correctAnswers: s.correctAnswer,
                points: points
              };
            });
        } else {
          // Scoring incomplete, show warning but continue without scoring
          console.warn(`Scoring map incomplete: max ${maxCorrectAnswer}, need ${totalQuestions}`);
          // Don't copy scoring templates - let user generate new ones
        }
      }

      // Create new quiz
      const result = await API.quizzes.createQuiz(quizData);

      if (result.success) {
        setShowCopyDialog(false);

        // Check if scoring was copied
        const scoringCopied = quizData.scoringTemplates && quizData.scoringTemplates.length > 0;
        const successMsg = scoringCopied
          ? 'Quiz berhasil di-copy sebagai template baru!'
          : 'Quiz berhasil di-copy sebagai template baru!\n\n⚠️ Scoring template tidak di-copy karena jumlah soal berbeda. Silakan generate scoring template baru di tab Scoring.';

        setDialogType('success');
        setDialogMessage(successMsg);
        setShowDialog(true);

        // Redirect to new quiz after delay
        setTimeout(() => {
          if (result.data?.id) {
            router.push(`/admin/quizzes/${result.data.id}`);
          } else {
            router.push('/admin/quizzes');
          }
        }, 2000);
      } else {
        setDialogType('error');
        setDialogMessage(result.message || 'Gagal meng-copy quiz');
        setShowDialog(true);
      }
    } catch (err: any) {
      console.error('Failed to copy quiz:', err);
      setDialogType('error');

      // Show more detailed error message
      const errorMsg = err?.response?.data?.message || err?.message || 'Gagal meng-copy quiz';
      setDialogMessage(errorMsg);
      setShowDialog(true);
    } finally {
      setCopying(false);
    }
  };

  // Question Management Functions
  const handleAddQuestion = () => {
    const newQuestion: Question = {
      questionText: '',
      questionType: 'multiple_choice',
      imageUrl: '',
      options: ['', '', '', ''],
      correctAnswer: [],
      points: 1,
      order: questions.length,
      isRequired: true,
    };
    setEditingQuestion(newQuestion);
    setShowQuestionDialog(true);
  };

  const handleEditQuestion = (question: Question, index: number) => {
    setEditingQuestion({
      ...question,
      imageUrl: question.imageUrl || '',
      // Store the original index to identify which question to update
      _editIndex: index
    } as any);
    setShowQuestionDialog(true);
  };

  const handleDeleteQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    // Reorder questions
    const reorderedQuestions = newQuestions.map((q, i) => ({ ...q, order: i }));
    setQuestions(reorderedQuestions);
    setHasUnsavedChanges(true);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;

    // Swap questions
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];

    // Update order
    const reorderedQuestions = newQuestions.map((q, i) => ({ ...q, order: i }));
    setQuestions(reorderedQuestions);
    setHasUnsavedChanges(true);
  };

  const handleSaveQuestion = () => {
    if (!editingQuestion) return;

    // Validate
    if (!editingQuestion.questionText.trim()) {
      setQuestionError('Teks pertanyaan harus diisi');
      return;
    }

    if (editingQuestion.questionType === 'multiple_choice' && editingQuestion.options.length < 2) {
      setQuestionError('Pertanyaan pilihan ganda minimal harus memiliki 2 pilihan');
      return;
    }

    // Essay questions don't need correct answers
    if (editingQuestion.questionType !== 'essay' && editingQuestion.correctAnswer.length === 0) {
      setQuestionError('Pilih minimal satu jawaban yang benar');
      return;
    }

    const editIndex = (editingQuestion as any)._editIndex;

    if (editIndex !== undefined && editIndex >= 0) {
      // Update existing question by index
      const updatedQuestions = [...questions];
      const { _editIndex, ...cleanQuestion } = editingQuestion as any;
      updatedQuestions[editIndex] = cleanQuestion;
      setQuestions(updatedQuestions);
    } else {
      // Add new question
      const { _editIndex, ...cleanQuestion } = editingQuestion as any;
      const newQuestion = {
        ...cleanQuestion,
        order: questions.length,
      };
      setQuestions([...questions, newQuestion]);
    }

    setHasUnsavedChanges(true);
    setShowQuestionDialog(false);
    setEditingQuestion(null);
    setQuestionError('');
  };

  const handleQuestionDialogClose = () => {
    setShowQuestionDialog(false);
    setEditingQuestion(null);
    setQuestionError('');
  };

  const updateEditingQuestionOption = (index: number, value: string) => {
    if (!editingQuestion) return;
    const newOptions = [...editingQuestion.options];
    newOptions[index] = value;
    setEditingQuestion({ ...editingQuestion, options: newOptions });
    // Clear error when user makes changes
    if (questionError) setQuestionError('');
  };

  const addOptionToEditingQuestion = () => {
    if (!editingQuestion) return;
    setEditingQuestion({
      ...editingQuestion,
      options: [...editingQuestion.options, ''],
    });
  };

  const removeOptionFromEditingQuestion = (index: number) => {
    if (!editingQuestion || editingQuestion.options.length <= 2) return;
    const newOptions = editingQuestion.options.filter((_, i) => i !== index);

    // Remove from correct answers and update indices
    const newcorrectAnswer = editingQuestion.correctAnswer
      .filter(a => a !== index.toString()) // Remove the deleted option's index
      .map(a => {
        // Update indices that come after the deleted one
        const idx = parseInt(a);
        if (!isNaN(idx) && idx > index) {
          return (idx - 1).toString();
        }
        return a;
      });

    setEditingQuestion({
      ...editingQuestion,
      options: newOptions,
      correctAnswer: newcorrectAnswer,
    });
  };

  const toggleCorrectAnswer = (option: string, optionIndex?: number) => {
    if (!editingQuestion) return;

    // Don't allow selecting empty options
    if (!option || option.trim() === '') {
      return;
    }

    // For multiple choice, use index to avoid duplicate value issues
    // For true/false, use the actual value
    const identifier = editingQuestion.questionType === 'multiple_choice' && optionIndex !== undefined
      ? optionIndex.toString()
      : option;

    const isSelected = editingQuestion.correctAnswer.includes(identifier);
    const newcorrectAnswer = isSelected
      ? editingQuestion.correctAnswer.filter(a => a !== identifier)
      : [...editingQuestion.correctAnswer, identifier];
    setEditingQuestion({
      ...editingQuestion,
      correctAnswer: newcorrectAnswer,
    });
    // Clear error when user makes changes
    if (questionError) setQuestionError('');
  };

  // Scoring Management Functions
  const handleSaveScoring = () => {
    if (!editingScoring) return;

    // Validate
    if (editingScoring.score < 0) {
      alert('Score tidak boleh negatif');
      return;
    }

    // Check if correctAnswer already exists
    const existingIndex = scoringMap.findIndex(s => s.correctAnswer === editingScoring.correctAnswer);

    if (existingIndex >= 0) {
      // Update existing
      const newMap = [...scoringMap];
      newMap[existingIndex] = editingScoring;
      setScoringMap(newMap);
    } else {
      // Add new
      setScoringMap([...scoringMap, editingScoring]);
    }

    setHasUnsavedChanges(true);
    setShowScoringDialog(false);
    setEditingScoring(null);
  };

  const handleGenerateLinearScoring = () => {
    // Check if questions exist
    if (questions.length === 0) {
      alert('⚠️ Belum ada pertanyaan!\n\nSilakan tambahkan pertanyaan terlebih dahulu di tab "Questions" sebelum generate scoring.');
      return;
    }

    const totalQuestions = questions.length;

    // Show info about total questions and confirm
    const confirmMessage = scoringMap.length > 0
      ? `📊 Informasi Quiz:\n• Total Pertanyaan: ${totalQuestions} soal\n• Sistem: Skor Linear (Persentase)\n• Maksimal Score: 100 poin\n\n⚠️ Anda sudah memiliki ${scoringMap.length} data scoring.\nGenerate Skor Linear akan MENGHAPUS semua data scoring yang ada dan menggantinya dengan template baru (0-${totalQuestions} jawaban benar).\n\nLanjutkan?`
      : `📊 Informasi Quiz:\n• Total Pertanyaan: ${totalQuestions} soal\n• Sistem: Skor Linear (Persentase)\n• Maksimal Score: 100 poin\n\nGenerate Skor Linear akan membuat ${totalQuestions + 1} mapping scoring.\n\nLanjutkan?`;

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) {
      return;
    }

    // Clear old scoring data first
    setScoringMap([]);

    // Generate linear scoring: percentage-based (max 100 points)
    const linearScoring = [];
    for (let i = 0; i <= totalQuestions; i++) {
      const score = Math.round((i / totalQuestions) * 100);
      linearScoring.push({
        correctAnswer: i,
        score: score  // 0=0, totalQuestions=100, calculated proportionally
      });
    }

    // Replace with new scoring data
    setScoringMap(linearScoring);
    setScoringType('linear');
    setHasUnsavedChanges(true);

    const exampleMid = Math.floor(totalQuestions / 2);
    const exampleMidScore = Math.round((exampleMid / totalQuestions) * 100);

    alert(`✅ Skor Linear berhasil di-generate!\n\n${totalQuestions + 1} mapping (0-${totalQuestions} jawaban benar) telah dibuat.\nFormula: (Benar ÷ ${totalQuestions}) × 100\n\nContoh:\n• 0 benar = 0 poin\n• ${exampleMid} benar = ${exampleMidScore} poin\n• ${totalQuestions} benar = 100 poin\n\nJangan lupa SAVE untuk menyimpan perubahan.`);
  };

  const handleGenerateIQConversionScoring = () => {
    // Check if there's existing scoring data
    if (scoringMap.length > 0) {
      const confirmed = window.confirm(
        `Anda sudah memiliki ${scoringMap.length} data scoring. Generate Skor Konversi IQ akan MENGHAPUS semua data scoring yang ada dan menggantinya dengan template baru (0-35 jawaban benar, berdasarkan tabel konversi standar). Lanjutkan?`
      );
      if (!confirmed) {
        return;
      }
    }

    // Clear old scoring data first
    setScoringMap([]);

    // Generate IQ conversion scoring template based on standard conversion table
    const iqConversionScoring = [
      { correctAnswer: 0, score: 73 }, { correctAnswer: 1, score: 73 }, { correctAnswer: 2, score: 73 },
      { correctAnswer: 3, score: 73 }, { correctAnswer: 4, score: 73 }, { correctAnswer: 5, score: 73 },
      { correctAnswer: 6, score: 73 }, { correctAnswer: 7, score: 73 }, { correctAnswer: 8, score: 77 },
      { correctAnswer: 9, score: 79 }, { correctAnswer: 10, score: 84 }, { correctAnswer: 11, score: 84 },
      { correctAnswer: 12, score: 88 }, { correctAnswer: 13, score: 88 }, { correctAnswer: 14, score: 92 },
      { correctAnswer: 15, score: 92 }, { correctAnswer: 16, score: 94 }, { correctAnswer: 17, score: 94 },
      { correctAnswer: 18, score: 98 }, { correctAnswer: 19, score: 98 }, { correctAnswer: 20, score: 101 },
      { correctAnswer: 21, score: 101 }, { correctAnswer: 22, score: 104 }, { correctAnswer: 23, score: 104 },
      { correctAnswer: 24, score: 108 }, { correctAnswer: 25, score: 108 }, { correctAnswer: 26, score: 112 },
      { correctAnswer: 27, score: 112 }, { correctAnswer: 28, score: 116 }, { correctAnswer: 29, score: 116 },
      { correctAnswer: 30, score: 120 }, { correctAnswer: 31, score: 120 }, { correctAnswer: 32, score: 123 },
      { correctAnswer: 33, score: 125 }, { correctAnswer: 34, score: 132 }, { correctAnswer: 35, score: 139 },
    ];

    // Replace with new scoring data
    setScoringMap(iqConversionScoring);
    setScoringType('iq-conversion');
    setHasUnsavedChanges(true);
    alert('✅ Skor Konversi IQ berhasil di-generate!\n\n36 mapping (0-35 jawaban benar) telah dibuat.\nBerdasarkan tabel konversi standar IQ\nRange score: 73-139\n\nJangan lupa SAVE untuk menyimpan perubahan.');
  };

  if (!quizId || loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => {
            if (hasUnsavedChanges) {
              if (confirm('Anda memiliki perubahan yang belum disimpan. Yakin ingin meninggalkan halaman?')) {
                router.push("/admin/quizzes");
              }
            } else {
              router.push("/admin/quizzes");
            }
          }}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Quizzes
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {isCreateMode ? "Create Quiz" : "Edit Quiz"}
          </h1>

          {!isCreateMode && (
            <div className="flex flex-col gap-3">
              {/* Display generated link if exists */}
              {quizToken && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-blue-600 font-medium mb-1">Quiz Link:</p>
                      <p className="text-sm text-blue-900 font-mono truncate">{quizToken}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(quizToken);
                        setDialogType('success');
                        setDialogMessage('Link copied to clipboard!');
                        setShowDialog(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 flex-shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                {/* Generate/Regenerate Link button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const result = await API.quizzes.generateQuizLink(Number(quizId));
                      if (result.success && result.data) {
                        const quizUrl = result.data.shortUrl || result.data.normalUrl;

                        // Update local state with new URLs (don't change published status)
                        setQuizToken(quizUrl);

                        setDialogType('success');
                        setDialogMessage(`Quiz link ${quizToken ? 'regenerated' : 'generated'} successfully and copied to clipboard!`);
                        setShowDialog(true);

                        // Also copy to clipboard
                        navigator.clipboard.writeText(quizUrl);
                      } else {
                        setDialogType('error');
                        setDialogMessage(result.message || 'Failed to generate quiz link');
                        setShowDialog(true);
                      }
                    } catch (err: any) {
                      console.error('Failed to generate link:', err);
                      setDialogType('error');
                      setDialogMessage(err?.message || 'Failed to generate quiz link');
                      setShowDialog(true);
                    }
                  }}
                  className="border-blue-600 text-blue-700 hover:bg-blue-50"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {quizToken ? 'Regenerate Link' : 'Generate Link'}
                </Button>

                {/* Publish/Unpublish button */}
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      const isCurrentlyPublished = formData.isPublished;
                      let result;

                      if (isCurrentlyPublished) {
                        result = await API.quizzes.unpublishQuiz(Number(quizId));
                      } else {
                        result = await API.quizzes.publishQuiz(Number(quizId));
                      }

                      if (result.success) {
                        setFormData({ ...formData, isPublished: !isCurrentlyPublished });

                        // Update token if published
                        if (result.data?.shortUrl || result.data?.normalUrl) {
                          const newToken = result.data.shortUrl || result.data.normalUrl || '';
                          setQuizToken(newToken);
                        }

                        setDialogType('success');
                        setDialogMessage(`Quiz ${!isCurrentlyPublished ? 'published' : 'unpublished'} successfully!`);
                        setShowDialog(true);
                      } else {
                        setDialogType('error');
                        setDialogMessage(result.message || 'Failed to update publish status');
                        setShowDialog(true);
                      }
                    } catch (err: any) {
                      console.error('Failed to update publish status:', err);
                      setDialogType('error');
                      setDialogMessage(err?.message || 'Failed to update publish status');
                      setShowDialog(true);
                    }
                  }}
                  className={formData.isPublished
                    ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                  }
                >
                  {formData.isPublished ? 'Unpublish' : 'Publish'}
                </Button>

                {/* Copy as Template button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyAsTemplate}
                  disabled={copying}
                  className="border-purple-600 text-purple-700 hover:bg-purple-50"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy as Template
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'general'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              General Info
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'questions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Questions ({questions.length})
            </button>
            <button
              onClick={() => setActiveTab('scoring')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'scoring'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Scoring ({scoringMap.length})
            </button>
          </nav>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* General Info Tab */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="title">
                  Judul Quiz <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Contoh: Quiz Alkitab Minggu Ini"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  rows={3}
                  placeholder="Contoh: Quiz tentang bacaan Alkitab minggu ini"
                />
              </div>

              <div>
                <Label htmlFor="location">Lokasi</Label>
                <Select
                  value={formData.locationKey || "none"}
                  onValueChange={(value) => {
                    setFormData({ ...formData, locationKey: value === "none" ? "" : value });
                    setHasUnsavedChanges(true);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih Lokasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Semua Lokasi</SelectItem>
                    {locationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="service">Service</Label>
                <Select
                  value={formData.serviceKey || "none"}
                  onValueChange={(value) => {
                    setFormData({ ...formData, serviceKey: value === "none" ? "" : value });
                    setHasUnsavedChanges(true);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih Service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Semua Service</SelectItem>
                    {serviceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="durationMinutes">Durasi (Menit)</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => {
                    setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 30 });
                    setHasUnsavedChanges(true);
                  }}
                  min="1"
                />
              </div>

              <div>
                <Label htmlFor="passingScore">Nilai Lulus (%)</Label>
                <Input
                  id="passingScore"
                  type="number"
                  value={formData.passingScore}
                  onChange={(e) => {
                    setFormData({ ...formData, passingScore: parseInt(e.target.value) || 60 });
                    setHasUnsavedChanges(true);
                  }}
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <Label htmlFor="questionsPerPage">Pertanyaan Per Halaman</Label>
                <Input
                  id="questionsPerPage"
                  type="number"
                  value={formData.questionsPerPage}
                  onChange={(e) => {
                    setFormData({ ...formData, questionsPerPage: parseInt(e.target.value) || 10 });
                    setHasUnsavedChanges(true);
                  }}
                  min="1"
                />
              </div>
            </div>

          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Pertanyaan Quiz</h3>
              <Button onClick={handleAddQuestion} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Pertanyaan
              </Button>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500 mb-4">Belum ada pertanyaan</p>
                <Button onClick={handleAddQuestion} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Pertanyaan Pertama
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((question, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1 mt-1">
                        <button
                          onClick={() => handleMoveQuestion(index, 'up')}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <button
                          onClick={() => handleMoveQuestion(index, 'down')}
                          disabled={index === questions.length - 1}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">#{index + 1}</span>
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                {question.questionType === 'multiple_choice' ? 'Pilihan Ganda' :
                                  question.questionType === 'true_false' ? 'Benar/Salah' : 'Essay'}
                              </span>
                            </div>
                            <p className="text-sm font-medium">{question.questionText}</p>

                            {/* TODO: Image functionality - currently disabled
                            {question.imageUrl && (
                              <div className="mt-2 border rounded-lg p-2 bg-white inline-block">
                                <img 
                                  src={question.imageUrl} 
                                  alt="Question image" 
                                  className="max-w-xs h-auto max-h-32 rounded"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            */}
                          </div>

                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleEditQuestion(question, index)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {question.questionType === 'multiple_choice' && question.options.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {question.options.map((option, optIndex) => {
                              const isCorrect = question.correctAnswer.includes(optIndex.toString()) || question.correctAnswer.includes(option);
                              return (
                                <div key={optIndex} className="flex items-center gap-2 text-sm">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${isCorrect
                                      ? 'bg-green-100 text-green-700 font-semibold'
                                      : 'bg-gray-200 text-gray-600'
                                    }`}>
                                    {String.fromCharCode(65 + optIndex)}
                                  </span>
                                  <span className={isCorrect ? 'font-medium' : ''}>
                                    {option}
                                  </span>
                                  {isCorrect && (
                                    <CheckCircle className="w-3 h-3 text-green-600 ml-1" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {question.questionType === 'true_false' && (
                          <div className="mt-2 text-sm">
                            <span className="text-gray-600">Jawaban benar: </span>
                            <span className="font-medium">
                              {question.correctAnswer.includes('true') ? 'Benar' : 'Salah'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scoring Tab */}
        {activeTab === 'scoring' && (
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">Pemetaan Scoring</h3>
                    {questions.length > 0 && (
                      <div className={`text-sm p-3 rounded-lg border ${scoringMap.length === questions.length + 1
                          ? 'bg-green-50 border-green-200 text-green-800'
                          : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                        }`}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {scoringMap.length === questions.length + 1 ? '✅' : '⚠️'}
                          </span>
                          <div>
                            <p className="font-semibold">
                              {scoringMap.length === questions.length + 1
                                ? 'Template Scoring Lengkap'
                                : 'Template Scoring Belum Lengkap'}
                            </p>
                            <p className="text-xs mt-1">
                              Quiz memiliki <strong>{questions.length} soal</strong>.
                              {scoringMap.length === questions.length + 1 ? (
                                <> Sudah ada <strong>{scoringMap.length} template</strong> (0-{questions.length} jawaban benar). ✅</>
                              ) : (
                                <> Harus ada <strong>{questions.length + 1} template</strong> (0-{questions.length} jawaban benar), saat ini baru <strong>{scoringMap.length} template</strong>.</>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scoring Type Selection */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    📊 Tipe Sistem Scoring:
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div
                      onClick={() => setScoringType('linear')}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${scoringType === 'linear'
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          checked={scoringType === 'linear'}
                          onChange={() => setScoringType('linear')}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">Skor Linear</h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Persentase (maksimal 100 poin)
                          </p>
                          <div className="text-xs text-gray-500 space-y-0.5">
                            <p>• Formula: (Benar ÷ Total) × 100</p>
                            <p>• Contoh 10 soal: 5 benar = 50 poin</p>
                            <p>• Semua benar = 100 poin</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => setScoringType('iq-conversion')}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${scoringType === 'iq-conversion'
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          checked={scoringType === 'iq-conversion'}
                          onChange={() => setScoringType('iq-conversion')}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">Skor Konversi IQ</h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Berdasarkan tabel konversi standar
                          </p>
                          <div className="text-xs text-gray-500 space-y-0.5">
                            <p>• Range: 73-139</p>
                            <p>• 0-7 benar = 73-77</p>
                            <p>• 35 benar = 139</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {scoringType === 'linear' ? (
                    <Button
                      onClick={handleGenerateLinearScoring}
                      size="sm"
                      variant="outline"
                      className="border-green-600 text-green-700 hover:bg-green-50"
                    >
                      🔢 Generate Skor Linear (Max 100)
                    </Button>
                  ) : (
                    <Button
                      onClick={handleGenerateIQConversionScoring}
                      size="sm"
                      variant="outline"
                      className="border-purple-600 text-purple-700 hover:bg-purple-50"
                    >
                      🧠 Generate Skor Konversi IQ (0-35)
                    </Button>
                  )}
                  <Button onClick={() => {
                    setEditingScoring({ correctAnswer: scoringMap.length, score: 0 });
                    setShowScoringDialog(true);
                  }} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Manual
                  </Button>
                </div>
              </div>

              {scoringMap.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-4">Belum ada pemetaan scoring</p>
                  <p className="text-sm text-gray-400 mb-6">Pilih tipe scoring di atas, lalu klik tombol generate</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button onClick={() => {
                      setEditingScoring({ correctAnswer: 0, score: 0 });
                      setShowScoringDialog(true);
                    }} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Manual
                    </Button>
                    {scoringType === 'linear' ? (
                      <Button onClick={handleGenerateLinearScoring} className="bg-green-600 hover:bg-green-700">
                        🔢 Generate Skor Linear
                      </Button>
                    ) : (
                      <Button onClick={handleGenerateIQConversionScoring} className="bg-purple-600 hover:bg-purple-700">
                        🧠 Generate Skor Konversi IQ
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Jumlah Benar
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {scoringMap
                        .sort((a, b) => a.correctAnswer - b.correctAnswer)
                        .map((scoring) => (
                          <tr key={scoring.correctAnswer} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {scoring.correctAnswer}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {scoring.score}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => {
                                  setEditingScoring({ ...scoring });
                                  setShowScoringDialog(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 mr-4"
                              >
                                <Edit2 className="w-4 h-4 inline" />
                              </button>
                              <button
                                onClick={() => {
                                  const newMap = scoringMap.filter(s => s.correctAnswer !== scoring.correctAnswer);
                                  setScoringMap(newMap);
                                  setHasUnsavedChanges(true);
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metadata Section */}
        {!isCreateMode && (metadata.createdAt || metadata.updatedAt) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Informasi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {metadata.createdAt && (
                <div>
                  <span className="text-gray-500">Dibuat pada:</span>
                  <p className="font-medium text-gray-900">
                    {new Date(metadata.createdAt).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {metadata.createdBy && (
                      <span className="text-gray-600"> oleh {metadata.createdBy}</span>
                    )}
                  </p>
                </div>
              )}
              {metadata.updatedAt && (
                <div>
                  <span className="text-gray-500">Terakhir diubah:</span>
                  <p className="font-medium text-gray-900">
                    {new Date(metadata.updatedAt).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-6 pt-6 border-t"><div>
          {!isCreateMode && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting || saving}
            >
              {deleting ? 'Menghapus...' : 'Hapus Quiz'}
            </Button>
          )}
        </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (confirm('Anda memiliki perubahan yang belum disimpan. Yakin ingin membatalkan?')) {
                    router.push("/admin/quizzes");
                  }
                } else {
                  router.push("/admin/quizzes");
                }
              }}
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || deleting}
            >
              {saving ? 'Menyimpan...' : (isCreateMode ? 'Buat Quiz' : 'Update Quiz')}
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-100">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              Konfirmasi Hapus
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus quiz ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Menghapus...' : 'Ya, Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success/Error Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        if (!open) return;
        setShowDialog(open);
      }}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${dialogType === 'success' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                {dialogType === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              {dialogType === 'success' ? 'Success' : 'Error'}
            </DialogTitle>
            <DialogDescription>
              {dialogMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={handleDialogClose}
              variant={dialogType === 'success' ? 'default' : 'destructive'}
            >
              {dialogType === 'success' ? 'OK' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Add/Edit Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion?.id ? 'Edit Pertanyaan' : 'Tambah Pertanyaan'}
            </DialogTitle>
          </DialogHeader>

          {editingQuestion && (
            <div className="space-y-4 py-4">
              {/* Error Message */}
              {questionError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-2">
                  <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{questionError}</p>
                </div>
              )}

              <div>
                <Label htmlFor="questionText">
                  Pertanyaan <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="questionText"
                  value={editingQuestion.questionText}
                  onChange={(e) => {
                    setEditingQuestion({ ...editingQuestion, questionText: e.target.value });
                    if (questionError) setQuestionError('');
                  }}
                  placeholder="Tulis pertanyaan di sini..."
                  rows={3}
                />
              </div>

              <div>
                {/* <Label htmlFor="imageUrl">
                  URL Gambar (Opsional)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="imageUrl"
                    type="url"
                    value={editingQuestion.imageUrl || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, imageUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                  {editingQuestion.imageUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(editingQuestion.imageUrl, '_blank')}
                      title="Preview gambar"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </Button>
                  )}
                </div> */}
                {/* TODO: Image functionality - currently disabled
                {editingQuestion.imageUrl && (
                  <div className="mt-2 border rounded-lg p-2 bg-gray-50">
                    <img 
                      src={editingQuestion.imageUrl} 
                      alt="Preview" 
                      className="max-w-full h-auto max-h-48 mx-auto rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling!.classList.remove('hidden');
                      }}
                    />
                    <p className="text-sm text-red-500 text-center mt-2 hidden">
                      Gagal memuat gambar. Periksa URL gambar.
                    </p>
                  </div>
                )}
                */}
              </div>

              <div>
                <Label htmlFor="questionType">Tipe Pertanyaan</Label>
                <Select
                  value={editingQuestion.questionType}
                  onValueChange={(value: QuestionType) => {
                    const newQuestion = { ...editingQuestion, questionType: value };
                    if (value === 'true_false') {
                      newQuestion.options = ['true', 'false'];
                      newQuestion.correctAnswer = [];
                    } else if (editingQuestion.questionType !== 'multiple_choice') {
                      newQuestion.options = ['', '', '', ''];
                      newQuestion.correctAnswer = [];
                    }
                    setEditingQuestion(newQuestion);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Pilihan Ganda</SelectItem>
                    <SelectItem value="true_false">Benar/Salah</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingQuestion.questionType === 'multiple_choice' && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Pilihan Jawaban <span className="text-red-500">*</span></Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addOptionToEditingQuestion}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Tambah Pilihan
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {editingQuestion.options.map((option, index) => {
                      const isOptionEmpty = !option || option.trim() === '';
                      return (
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            type="checkbox"
                            checked={editingQuestion.correctAnswer.includes(option)}
                            onChange={() => toggleCorrectAnswer(option)}
                            disabled={isOptionEmpty}
                            className={`w-4 h-4 ${isOptionEmpty ? 'opacity-50 cursor-not-allowed' : 'text-green-600 cursor-pointer'}`}
                            title={isOptionEmpty ? 'Isi jawaban terlebih dahulu' : 'Centang jika jawaban benar'}
                          />
                          <span className="w-6 text-center font-medium text-sm">
                            {String.fromCharCode(65 + index)}.
                          </span>
                          <Input
                            value={option}
                            onChange={(e) => updateEditingQuestionOption(index, e.target.value)}
                            placeholder={`Pilihan ${String.fromCharCode(65 + index)}`}
                            className="flex-1"
                          />
                          {editingQuestion.options.length > 2 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeOptionFromEditingQuestion(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    ✓ Centang kotak di sebelah kiri untuk menandai jawaban yang benar (harus isi jawaban dulu)
                  </p>
                </div>
              )}

              {editingQuestion.questionType === 'true_false' && (
                <div>
                  <Label>Jawaban Benar <span className="text-red-500">*</span></Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="trueFalse"
                        checked={editingQuestion.correctAnswer.includes('true')}
                        onChange={() => setEditingQuestion({ ...editingQuestion, correctAnswer: ['true'] })}
                        className="w-4 h-4"
                      />
                      <span>Benar</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="trueFalse"
                        checked={editingQuestion.correctAnswer.includes('false')}
                        onChange={() => setEditingQuestion({ ...editingQuestion, correctAnswer: ['false'] })}
                        className="w-4 h-4"
                      />
                      <span>Salah</span>
                    </label>
                  </div>
                </div>
              )}

              {editingQuestion.questionType === 'essay' && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Info:</strong> Pertanyaan essay akan dinilai secara manual oleh admin.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleQuestionDialogClose}>
              Batal
            </Button>
            <Button onClick={handleSaveQuestion}>
              Simpan Pertanyaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scoring Dialog */}
      <Dialog open={showScoringDialog} onOpenChange={setShowScoringDialog}>
        <DialogContent
          className="max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {editingScoring && scoringMap.find(s => s.correctAnswer === editingScoring.correctAnswer)
                ? 'Edit Scoring'
                : 'Tambah Scoring'}
            </DialogTitle>
          </DialogHeader>

          {editingScoring && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="correctAnswer">
                  Jumlah Jawaban Benar <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="correctAnswer"
                  type="number"
                  min="0"
                  value={editingScoring.correctAnswer}
                  onChange={(e) => setEditingScoring({
                    ...editingScoring,
                    correctAnswer: parseInt(e.target.value) || 0
                  })}
                  placeholder="Contoh: 10"
                  required
                />
              </div>

              <div>
                <Label htmlFor="score">
                  Score <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="score"
                  type="number"
                  min="0"
                  value={editingScoring.score}
                  onChange={(e) => setEditingScoring({
                    ...editingScoring,
                    score: parseInt(e.target.value) || 0
                  })}
                  placeholder="Contoh: 85"
                  required
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowScoringDialog(false);
                setEditingScoring(null);
              }}
            >
              Batal
            </Button>
            <Button onClick={handleSaveScoring}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy as Template Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy Quiz sebagai Template</DialogTitle>
            <DialogDescription>
              Buat quiz baru dengan meng-copy semua pertanyaan, scoring, dan pengaturan dari quiz ini.
              Quiz baru akan dibuat dengan status tidak aktif.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="copyTitle">
                Nama Quiz Baru <span className="text-red-500">*</span>
              </Label>
              <Input
                id="copyTitle"
                type="text"
                value={copyFormData.title}
                onChange={(e) => setCopyFormData({ ...copyFormData, title: e.target.value })}
                placeholder="Contoh: Quiz Alkitab Januari 2024"
                required
              />
            </div>

            <div>
              <Label htmlFor="copyLocation">Location</Label>
              <Select
                value={copyFormData.locationKey || "none"}
                onValueChange={(value) => setCopyFormData({ ...copyFormData, locationKey: value === "none" ? "" : value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Lokasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Semua Lokasi</SelectItem>
                  {locationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="copyService">Service</Label>
              <Select
                value={copyFormData.serviceKey || "none"}
                onValueChange={(value) => setCopyFormData({ ...copyFormData, serviceKey: value === "none" ? "" : value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Semua Service</SelectItem>
                  {serviceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Yang akan di-copy:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-1 ml-4 list-disc">
                <li>{questions.length} pertanyaan</li>
                <li>{scoringMap.length} pemetaan scoring</li>
                <li>Semua pengaturan quiz (durasi, passing score, dll)</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCopyDialog(false)}
              disabled={copying}
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmitCopy}
              disabled={copying || !copyFormData.title.trim()}
            >
              {copying ? 'Meng-copy...' : 'Copy Quiz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}