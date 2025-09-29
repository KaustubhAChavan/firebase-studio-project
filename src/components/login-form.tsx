
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Eye,
  EyeOff,
  User,
  Shield,
  KeyRound,
  Copy,
  Wand2,
  LoaderCircle,
  Briefcase,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { suggestStrongPassword } from "@/ai/flows/suggest-strong-password";
import type { SuggestStrongPasswordInput } from "@/ai/flows/suggest-strong-password";
import { useAppContext, UserData } from "@/context/AppContext";

const formSchema = z.object({
  fullName: z.string().min(1, "Please select your username"),
  password: z.string().min(1, "Password is required"),
  project: z.string().min(1, "Please select a project to continue"),
});

const passwordGeneratorSchema = z.object({
  minLength: z.array(z.number()).length(1),
  requireNumbers: z.boolean(),
  requireSymbols: z.boolean(),
});

export function LoginForm() {
  const router = useRouter();
  const { users, setSelectedProject, setCurrentUser } = useAppContext();
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      password: "",
      project: "",
    },
  });

  const generatorForm = useForm<z.infer<typeof passwordGeneratorSchema>>({
    resolver: zodResolver(passwordGeneratorSchema),
    defaultValues: {
      minLength: [12],
      requireNumbers: true,
      requireSymbols: true,
    },
  });

  const handleUserChange = (fullName: string) => {
    const user = users.find((u) => u.fullName === fullName);
    setSelectedUser(user || null);
    form.setValue("fullName", fullName, { shouldValidate: true });

    const userProjects = user?.projects || [];
    if (userProjects.length === 1) {
      form.setValue("project", userProjects[0], { shouldValidate: true });
    } else {
      form.resetField("project");
    }
  };
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    const user = users.find(u => u.fullName === values.fullName);

    if (user && user.password === values.password) {
        if (user.projects.includes(values.project)) {
            setSelectedProject(values.project);
            setCurrentUser(user);
            router.push("/dashboard");
        } else {
             toast({
                variant: "destructive",
                title: "Access Denied",
                description: "You do not have access to the selected project.",
            });
        }
    } else {
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: "Invalid username or password. Please try again.",
        });
    }
  }

  async function onGeneratePassword(values: z.infer<typeof passwordGeneratorSchema>) {
    setIsGenerating(true);
    setGeneratedPassword("");
    try {
      const result = await suggestStrongPassword({
        minLength: values.minLength[0],
        requireNumbers: values.requireNumbers,
        requireSymbols: values.requireSymbols,
      });
      if (result.password) {
        setGeneratedPassword(result.password);
      } else {
        throw new Error("Failed to generate password.");
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not generate a password. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  const useGeneratedPassword = () => {
    if (generatedPassword) {
      form.setValue("password", generatedPassword, { shouldValidate: true });
      toast({
        title: "Password Applied",
        description: "The generated password has been set.",
      });
      setIsGeneratorOpen(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      toast({
        title: "Copied to Clipboard",
      });
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="items-center">
        <Image
          src="/logo.png"
          width={250}
          height={100}
          alt="KCC Logo"
          data-ai-hint="company logo"
          className="object-contain"
        />
        <CardDescription className="text-center pt-4">
          Welcome To Kothari Construction Company
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" /> User
                  </FormLabel>
                  <Select onValueChange={handleUserChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.phoneNo} value={user.fullName}>
                            {user.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="project"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" /> Project
                      </FormLabel>
                       {(selectedUser?.projects?.length ?? 0) > 1 ? (
                         <Select onValueChange={field.onChange} value={field.value}>
                           <FormControl>
                             <SelectTrigger>
                               <SelectValue placeholder="Select a project" />
                             </SelectTrigger>
                           </FormControl>
                           <SelectContent>
                             {selectedUser?.projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                           </SelectContent>
                         </Select>
                       ) : (
                         <FormControl>
                           <Input value={selectedUser?.projects?.[0] || ''} disabled placeholder="Project" />
                         </FormControl>
                       )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                    <FormLabel className="flex items-center gap-2">
                        <Shield className="h-4 w-4" /> Role
                    </FormLabel>
                     <FormControl>
                        <Input value={selectedUser?.role || ''} disabled placeholder="Role" />
                     </FormControl>
                </FormItem>
            </div>
           
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4" /> Password
                  </FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute inset-y-0 right-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {showPassword ? "Hide password" : "Show password"}
                      </span>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="pt-2 space-y-2">
                 <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="w-full">
                      <Wand2 className="mr-2 h-4 w-4" />
                      Suggest a Strong Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Password Generator</DialogTitle>
                      <DialogDescription>
                        Customize and generate a secure password.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...generatorForm}>
                      <form onSubmit={generatorForm.handleSubmit(onGeneratePassword)} className="space-y-6 py-4">
                        <FormField
                          control={generatorForm.control}
                          name="minLength"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password Length: {field.value[0]}</FormLabel>
                              <FormControl>
                                <Slider
                                  min={8}
                                  max={32}
                                  step={1}
                                  defaultValue={field.value}
                                  onValueChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="flex items-center justify-between">
                          <FormField
                            control={generatorForm.control}
                            name="requireNumbers"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center gap-3 space-y-0">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel>Include Numbers</FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={generatorForm.control}
                            name="requireSymbols"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center gap-3 space-y-0">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel>Include Symbols</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={isGenerating}>
                          {isGenerating ? (
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Wand2 className="mr-2 h-4 w-4" />
                          )}
                          Generate
                        </Button>
                      </form>
                    </Form>
                    {generatedPassword && (
                        <div className="space-y-4">
                            <p className="text-sm font-medium">Generated Password:</p>
                            <div className="flex items-center gap-2 rounded-md border bg-muted p-3 font-mono text-lg">
                              <span className="flex-1 break-all">{generatedPassword}</span>
                                <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                                    <Copy className="h-5 w-5"/>
                                    <span className="sr-only">Copy password</span>
                                </Button>
                            </div>
                            <Button onClick={useGeneratedPassword} className="w-full">Use This Password</Button>
                        </div>
                    )}
                  </DialogContent>
                </Dialog>
                <Button type="submit" className="w-full text-lg py-6">Login</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
