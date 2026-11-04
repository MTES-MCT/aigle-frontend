import React, { useState } from 'react';

import { webinarEndpoints } from '@/api/endpoints';
import LayoutAdminForm from '@/components/admin/LayoutAdminForm';
import UnsavedChangesGuard from '@/components/admin/UnsavedChangesGuard';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import { useFilterNavigation } from '@/hooks/useFilterNavigation';
import { Webinar } from '@/models/help-center';
import api, { ApiError } from '@/utils/api';
import { Button, Group, Input, Modal, Stack, Text, TextInput } from '@mantine/core';
import { DateInput, TimeInput } from '@mantine/dates';
import { UseFormReturnType, isNotEmpty, useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { RichTextEditor } from '@mantine/tiptap';
import { IconCalendarPlus, IconTrash } from '@tabler/icons-react';
import { UseMutationResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import LinkExtension from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { format, parse } from 'date-fns';
import { Link, useParams } from 'react-router-dom';
import classes from './index.module.scss';

const BACK_URL = '/admin/webinars';

interface FormValues {
    title: string;
    description: string;
    date: Date | null;
    // "HH:MM" from the time inputs, "" when left empty.
    startTime: string;
    endTime: string;
    registrationUrl: string;
    visioUrl: string;
    replayUrl: string;
}

const EMPTY_FORM_VALUES: FormValues = {
    title: '',
    description: '',
    date: null,
    startTime: '',
    endTime: '',
    registrationUrl: '',
    visioUrl: '',
    replayUrl: '',
};

const webinarToFormValues = (webinar: Webinar): FormValues => ({
    title: webinar.title,
    description: webinar.description,
    date: parse(webinar.date, 'yyyy-MM-dd', new Date()),
    startTime: webinar.startTime ?? '',
    endTime: webinar.endTime ?? '',
    registrationUrl: webinar.registrationUrl ?? '',
    visioUrl: webinar.visioUrl ?? '',
    replayUrl: webinar.replayUrl ?? '',
});

const postForm = (values: FormValues, uuid?: string) => {
    const body = {
        title: values.title,
        description: values.description,
        date: values.date ? format(values.date, 'yyyy-MM-dd') : null,
        startTime: values.startTime || null,
        endTime: values.endTime || null,
        registrationUrl: values.registrationUrl || null,
        visioUrl: values.visioUrl || null,
        replayUrl: values.replayUrl || null,
    };

    if (uuid) {
        return api<Webinar>(webinarEndpoints.detail(uuid), { method: 'PATCH', body });
    }
    return api<Webinar>(webinarEndpoints.create, { method: 'POST', body });
};

const validateOptionalUrl = (value: string) => {
    if (!value) {
        return null;
    }

    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) ? null : 'Le lien doit commencer par https://';
    } catch {
        return "Le format du lien est invalide (ex : 'https://…')";
    }
};

interface DescriptionEditorProps {
    initialContent: string;
    onChange: (html: string) => void;
    error?: React.ReactNode;
}

// Only what the API keeps: paragraphs, emphasis, lists and links (see aigle-api core/utils/html.py).
const DescriptionEditor: React.FC<DescriptionEditorProps> = ({ initialContent, onChange, error }) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false,
                blockquote: false,
                code: false,
                codeBlock: false,
                horizontalRule: false,
            }),
            Underline,
            LinkExtension.configure({ openOnClick: false }),
        ],
        content: initialContent,
        onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
    });

    return (
        <Input.Wrapper mt="md" label="Description" error={error}>
            <RichTextEditor editor={editor} className={classes.editor}>
                <RichTextEditor.Toolbar>
                    <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Bold />
                        <RichTextEditor.Italic />
                        <RichTextEditor.Underline />
                        <RichTextEditor.Strikethrough />
                        <RichTextEditor.ClearFormatting />
                    </RichTextEditor.ControlsGroup>
                    <RichTextEditor.ControlsGroup>
                        <RichTextEditor.BulletList />
                        <RichTextEditor.OrderedList />
                    </RichTextEditor.ControlsGroup>
                    <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Link />
                        <RichTextEditor.Unlink />
                    </RichTextEditor.ControlsGroup>
                    <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Undo />
                        <RichTextEditor.Redo />
                    </RichTextEditor.ControlsGroup>
                </RichTextEditor.Toolbar>
                <RichTextEditor.Content />
            </RichTextEditor>
        </Input.Wrapper>
    );
};

interface FormProps {
    uuid?: string;
    initialValues: FormValues;
}

const Form: React.FC<FormProps> = ({ uuid, initialValues }) => {
    const [error, setError] = useState<ApiError>();
    const { navigate, buildPath } = useFilterNavigation();
    const queryClient = useQueryClient();
    const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

    const form: UseFormReturnType<FormValues> = useForm({
        initialValues,
        validate: {
            title: isNotEmpty('Le titre du webinaire est requis'),
            date: isNotEmpty('La date du webinaire est requise'),
            startTime: (value, values) =>
                !value && values.endTime ? 'Renseignez l’heure de début et l’heure de fin, ou aucune des deux' : null,
            endTime: (value, values) => {
                if (!value && values.startTime) {
                    return 'Renseignez l’heure de début et l’heure de fin, ou aucune des deux';
                }
                if (value && values.startTime && value <= values.startTime) {
                    return 'L’heure de fin doit être postérieure à l’heure de début';
                }
                return null;
            },
            registrationUrl: validateOptionalUrl,
            visioUrl: validateOptionalUrl,
            replayUrl: validateOptionalUrl,
        },
    });

    const onSaved = () => {
        form.resetDirty();
        queryClient.invalidateQueries({ queryKey: [webinarEndpoints.list] });
        if (uuid) {
            queryClient.removeQueries({ queryKey: [webinarEndpoints.detail(uuid)] });
        }
        navigate(BACK_URL);
    };

    const onError = (error: ApiError) => {
        setError(error);
        if (error.body) {
            // @ts-expect-error types do not match
            form.setErrors(error.body);
        }
    };

    const mutation: UseMutationResult<Webinar, ApiError, FormValues> = useMutation({
        mutationFn: (values: FormValues) => postForm(values, uuid),
        onSuccess: onSaved,
        onError,
    });

    const deleteMutation: UseMutationResult<void, ApiError, string> = useMutation({
        mutationFn: (uuid: string) => api<void>(webinarEndpoints.detail(uuid), { method: 'DELETE' }),
        onSuccess: onSaved,
        onError: (error) => {
            closeDeleteModal();
            setError(error);
        },
    });

    const isPending = mutation.status === 'pending' || deleteMutation.status === 'pending';
    const label = uuid ? 'Modifier un webinaire' : 'Ajouter un webinaire';

    return (
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
            <UnsavedChangesGuard isDirty={form.isDirty} />
            <h1>{label}</h1>
            {error ? (
                <ErrorCard>
                    <p>Voir les indications ci-dessous pour plus d&apos;info</p>
                </ErrorCard>
            ) : null}

            <TextInput
                mt="md"
                withAsterisk
                label="Titre"
                placeholder="Webinaire produit : les nouveautés d’AIGLE"
                key={form.key('title')}
                {...form.getInputProps('title')}
            />

            <DescriptionEditor
                initialContent={initialValues.description}
                onChange={(html) => form.setFieldValue('description', html)}
                error={form.errors.description}
            />

            <h2 className="form-sub-title">Date et horaire</h2>
            <Text size="sm" c="dimmed">
                En heure de Paris : c’est l’heure affichée aux utilisateurs, où qu’ils soient. Sans horaire, le
                webinaire reste dans « Prochains webinaires » jusqu’à la fin de la journée et n’est jamais signalé « en
                cours ».
            </Text>
            <DateInput
                mt="md"
                withAsterisk
                label="Date"
                dateParser={(value: string) => parse(value, 'dd/MM/yyyy', new Date())}
                valueFormat="DD/MM/YYYY"
                placeholder="13/10/2026"
                key={form.key('date')}
                {...form.getInputProps('date')}
            />
            <Group grow align="flex-start">
                <TimeInput
                    mt="md"
                    label="Heure de début"
                    key={form.key('startTime')}
                    {...form.getInputProps('startTime')}
                />
                <TimeInput mt="md" label="Heure de fin" key={form.key('endTime')} {...form.getInputProps('endTime')} />
            </Group>

            <h2 className="form-sub-title">Liens</h2>
            <TextInput
                mt="md"
                label="Lien d’inscription"
                description="Bouton « S’inscrire » tant que le webinaire n’est pas passé"
                placeholder="https://…"
                key={form.key('registrationUrl')}
                {...form.getInputProps('registrationUrl')}
            />
            <TextInput
                mt="md"
                label="Lien de la visio"
                description="Bouton « Lien de connexion », et « Rejoindre la visio » pendant le webinaire"
                placeholder="https://visio.numerique.gouv.fr/…"
                key={form.key('visioUrl')}
                {...form.getInputProps('visioUrl')}
            />
            <TextInput
                mt="md"
                label="Lien du replay"
                description="Une vidéo tube.numerique.gouv.fr ou Loom se lit dans le centre d’aide, tout autre lien s’ouvre dans un nouvel onglet"
                placeholder="https://tube.numerique.gouv.fr/w/…"
                key={form.key('replayUrl')}
                {...form.getInputProps('replayUrl')}
            />

            <div className="form-actions">
                {uuid ? (
                    <Button
                        className={classes['delete-button']}
                        disabled={isPending}
                        type="button"
                        color="red"
                        variant="outline"
                        leftSection={<IconTrash />}
                        onClick={openDeleteModal}
                    >
                        Supprimer
                    </Button>
                ) : null}

                <Button disabled={isPending} type="button" variant="outline" component={Link} to={buildPath(BACK_URL)}>
                    Annuler
                </Button>

                <Button
                    disabled={isPending}
                    loading={mutation.status === 'pending'}
                    type="submit"
                    leftSection={<IconCalendarPlus />}
                >
                    {label}
                </Button>
            </div>

            {uuid ? (
                <Modal opened={deleteModalOpened} onClose={closeDeleteModal} title="Supprimer le webinaire" centered>
                    <Stack>
                        <Text size="sm">« {initialValues.title} » ne sera plus affiché dans le centre d’aide.</Text>
                        <Group justify="flex-end">
                            <Button variant="outline" onClick={closeDeleteModal} disabled={isPending}>
                                Annuler
                            </Button>
                            <Button
                                color="red"
                                leftSection={<IconTrash />}
                                loading={deleteMutation.status === 'pending'}
                                onClick={() => deleteMutation.mutate(uuid)}
                            >
                                Supprimer
                            </Button>
                        </Group>
                    </Stack>
                </Modal>
            ) : null}
        </form>
    );
};

const ComponentInner: React.FC = () => {
    const { uuid } = useParams();

    const {
        isLoading,
        error,
        data: initialValues,
    } = useQuery({
        queryKey: [webinarEndpoints.detail(String(uuid))],
        enabled: !!uuid,
        queryFn: async () => webinarToFormValues(await api<Webinar>(webinarEndpoints.detail(String(uuid)))),
    });

    if (isLoading) {
        return <Loader />;
    }

    if (error) {
        return <ErrorCard>{error.message}</ErrorCard>;
    }

    return <Form uuid={uuid} initialValues={initialValues || EMPTY_FORM_VALUES} />;
};

const Component: React.FC = () => {
    return (
        <LayoutAdminForm title="Formulaire webinaire" backText="Liste des webinaires" backUrl={BACK_URL}>
            <ComponentInner />
        </LayoutAdminForm>
    );
};

export default Component;
